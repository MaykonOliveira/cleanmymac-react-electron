import { ipcMain, shell, dialog, app, BrowserWindow, Notification } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { SCAN_PROFILES } from './scanners.js'
import { createIpcHandlers, DEFAULT_SETTINGS, type ReminderFrequency, type ScanSettings } from './ipc-handlers.js'

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'scan-settings.json')
}

function normalizeSettings(parsed: unknown): ScanSettings {
  const candidate = parsed && typeof parsed === 'object' ? parsed as Partial<ScanSettings> : {}

  const authorizedDirectories = Array.isArray(candidate.authorizedDirectories)
    ? candidate.authorizedDirectories.filter((entry): entry is string => typeof entry === 'string')
    : [app.getPath('home')]

  const scanProfile =
    typeof candidate.scanProfile === 'string' && Object.hasOwn(SCAN_PROFILES, candidate.scanProfile)
      ? (candidate.scanProfile as keyof typeof SCAN_PROFILES)
      : DEFAULT_SETTINGS.scanProfile

  const reminderFrequency =
    candidate.reminder?.frequency === 'weekly' || candidate.reminder?.frequency === 'monthly' || candidate.reminder?.frequency === 'off'
      ? candidate.reminder.frequency
      : DEFAULT_SETTINGS.reminder.frequency

  const reminder = {
    frequency: reminderFrequency,
    nextReminderAt: typeof candidate.reminder?.nextReminderAt === 'number' ? candidate.reminder.nextReminderAt : undefined,
    lastReminderSentAt:
      typeof candidate.reminder?.lastReminderSentAt === 'number' ? candidate.reminder.lastReminderSentAt : undefined
  }

  const metricsEnabled = typeof candidate.metrics?.enabled === 'boolean' ? candidate.metrics.enabled : DEFAULT_SETTINGS.metrics.enabled

  return {
    authorizedDirectories: authorizedDirectories.length > 0 ? authorizedDirectories : [app.getPath('home')],
    scanProfile,
    reminder,
    metrics: {
      enabled: metricsEnabled,
      totals: {
        scansStarted: candidate.metrics?.totals?.scansStarted ?? 0,
        scansCompleted: candidate.metrics?.totals?.scansCompleted ?? 0,
        cleanActions: candidate.metrics?.totals?.cleanActions ?? 0,
        itemsSelected: candidate.metrics?.totals?.itemsSelected ?? 0,
        itemsDeleted: candidate.metrics?.totals?.itemsDeleted ?? 0,
        bytesDeleted: candidate.metrics?.totals?.bytesDeleted ?? 0
      },
      timeline: {
        firstScanAt: candidate.metrics?.timeline?.firstScanAt,
        lastScanAt: candidate.metrics?.timeline?.lastScanAt,
        lastCleanAt: candidate.metrics?.timeline?.lastCleanAt
      },
      history: Array.isArray(candidate.metrics?.history)
        ? candidate.metrics.history
          .filter((entry) => entry && typeof entry === 'object')
          .map((entry) => {
            const record = entry as Record<string, unknown>
            return {
              at: typeof record.at === 'number' ? record.at : Date.now(),
              deletedCount: typeof record.deletedCount === 'number' ? Math.max(0, Math.floor(record.deletedCount)) : 0,
              failedCount: typeof record.failedCount === 'number' ? Math.max(0, Math.floor(record.failedCount)) : 0,
              deletedBytes: typeof record.deletedBytes === 'number' ? Math.max(0, Math.floor(record.deletedBytes)) : 0,
              deletedByCategory: record.deletedByCategory && typeof record.deletedByCategory === 'object'
                ? record.deletedByCategory as Record<string, number>
                : {}
            }
          })
          .slice(0, 30)
        : []
    }
  }
}

async function loadScanSettings(): Promise<ScanSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf-8')
    const parsed = JSON.parse(raw)
    return normalizeSettings(parsed)
  } catch {
    return normalizeSettings(DEFAULT_SETTINGS)
  }
}

async function saveScanSettings(settings: ScanSettings): Promise<ScanSettings> {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
  return settings
}

async function addAuthorizedDirectory(): Promise<ScanSettings | null> {
  const result = await dialog.showOpenDialog({
    title: 'Selecionar pasta para análise',
    properties: ['openDirectory', 'createDirectory']
  })

  if (result.canceled || !result.filePaths.length) return null

  const selectedPath = path.resolve(result.filePaths[0])
  const currentSettings = await loadScanSettings()
  const nextDirectories = Array.from(new Set([...currentSettings.authorizedDirectories, selectedPath]))

  return saveScanSettings({
    ...currentSettings,
    authorizedDirectories: nextDirectories
  })
}

const REMINDER_INTERVAL_MS: Record<Exclude<ReminderFrequency, 'off'>, number> = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
}

function computeNextReminder(frequency: ReminderFrequency, from = Date.now()): number | undefined {
  if (frequency === 'off') return undefined
  return from + REMINDER_INTERVAL_MS[frequency]
}

function formatFrequencyLabel(frequency: ReminderFrequency): string {
  if (frequency === 'monthly') return 'mensal'
  if (frequency === 'weekly') return 'semanal'
  return 'desativado'
}

let reminderInterval: NodeJS.Timeout | null = null

async function checkAndDispatchReminder(getWindow: () => BrowserWindow | null, handlers: ReturnType<typeof createIpcHandlers>) {
  const settings = await loadScanSettings()
  const reminder = settings.reminder
  if (reminder.frequency === 'off') return

  const now = Date.now()
  const dueAt = reminder.nextReminderAt ?? computeNextReminder(reminder.frequency, now)
  if (!dueAt || dueAt > now) return

  const win = getWindow()
  if (win) {
    win.webContents.send('scan-reminder', { frequency: reminder.frequency, dueAt })
  }

  if (Notification.isSupported()) {
    new Notification({
      title: 'Lembrete de análise',
      body: `Hora de executar sua análise ${formatFrequencyLabel(reminder.frequency)} no CleanMyMac Pro.`
    }).show()
  }

  await handlers.markReminderSent()
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  const handlers = createIpcHandlers({
    getHomePath: () => app.getPath('home'),
    getWindow,
    loadScanSettings,
    saveScanSettings,
    addAuthorizedDirectory,
    trashItem: shell.trashItem,
    onSettingsUpdated: (settings) => {
      if (settings.reminder.frequency !== 'off' && !settings.reminder.nextReminderAt) {
        void saveScanSettings({
          ...settings,
          reminder: {
            ...settings.reminder,
            nextReminderAt: computeNextReminder(settings.reminder.frequency)
          }
        })
      }
    }
  })

  ipcMain.handle('scan-all', handlers.scanAll)
  ipcMain.handle('scan-settings:get', handlers.getScanSettings)
  ipcMain.handle('scan-settings:add-directory', handlers.addScanDirectory)
  ipcMain.handle('scan-settings:remove-directory', handlers.removeScanDirectory)
  ipcMain.handle('scan-settings:set-profile', handlers.setScanProfile)
  ipcMain.handle('scan-settings:set-reminder-frequency', handlers.setReminderFrequency)
  ipcMain.handle('metrics:set-opt-in', handlers.setMetricsOptIn)
  ipcMain.handle('metrics:track-event', handlers.trackMetricEvent)
  ipcMain.handle('metrics:get-cleanup-insights', handlers.getCleanupInsights)
  ipcMain.handle('delete-items', handlers.deleteItems)

  if (reminderInterval) clearInterval(reminderInterval)
  reminderInterval = setInterval(() => {
    void checkAndDispatchReminder(getWindow, handlers)
  }, 60 * 1000)

  void checkAndDispatchReminder(getWindow, handlers)
}
