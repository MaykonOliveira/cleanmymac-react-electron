import { ipcMain, shell, dialog, app, BrowserWindow, Notification } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { SCAN_PROFILES } from './scanners.js'
import {
  createIpcHandlers,
  DEFAULT_SETTINGS,
  DEFAULT_AUTOMATION,
  type ReminderFrequency,
  type AutomationRule,
  type ScanSettings
} from './ipc-handlers.js'

const execFileAsync = promisify(execFile)

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'scan-settings.json')
}

function normalizeAutomationRule(raw: Record<string, unknown>): AutomationRule | null {
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null

  const frequency =
    raw.frequency === 'daily' || raw.frequency === 'weekly' || raw.frequency === 'monthly'
      ? raw.frequency
      : 'weekly'

  const mode = raw.mode === 'auto' || raw.mode === 'suggest' ? raw.mode : 'suggest'

  const profile =
    typeof raw.profile === 'string' && Object.hasOwn(SCAN_PROFILES, raw.profile)
      ? (raw.profile as keyof typeof SCAN_PROFILES)
      : 'safe'

  return {
    id: raw.id,
    name: raw.name,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    frequency,
    windowHour: typeof raw.windowHour === 'number' ? Math.max(0, Math.min(23, Math.floor(raw.windowHour))) : 3,
    diskThresholdPercent: typeof raw.diskThresholdPercent === 'number' ? Math.max(0, Math.min(100, Math.floor(raw.diskThresholdPercent))) : 0,
    mode,
    profile,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    lastRunAt: typeof raw.lastRunAt === 'number' ? raw.lastRunAt : undefined,
    nextRunAt: typeof raw.nextRunAt === 'number' ? raw.nextRunAt : undefined
  }
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

  const rawRules = Array.isArray((candidate as Record<string, unknown> & { automation?: { rules?: unknown[] } }).automation?.rules)
    ? (candidate as Record<string, unknown> & { automation: { rules: unknown[] } }).automation.rules
    : []

  const rawLogs = Array.isArray((candidate as Record<string, unknown> & { automation?: { logs?: unknown[] } }).automation?.logs)
    ? (candidate as Record<string, unknown> & { automation: { logs: unknown[] } }).automation.logs
    : []

  const automationRules = rawRules
    .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
    .map(normalizeAutomationRule)
    .filter((r): r is AutomationRule => r !== null)

  const automationLogs = rawLogs
    .filter((l): l is Record<string, unknown> => l !== null && typeof l === 'object')
    .map((l) => ({
      ruleId: typeof l.ruleId === 'string' ? l.ruleId : '',
      ruleName: typeof l.ruleName === 'string' ? l.ruleName : '',
      at: typeof l.at === 'number' ? l.at : Date.now(),
      mode: l.mode === 'auto' || l.mode === 'suggest' ? l.mode as 'auto' | 'suggest' : 'suggest',
      itemsFound: typeof l.itemsFound === 'number' ? l.itemsFound : 0,
      itemsDeleted: typeof l.itemsDeleted === 'number' ? l.itemsDeleted : 0,
      bytesDeleted: typeof l.bytesDeleted === 'number' ? l.bytesDeleted : 0,
      status: (['success', 'partial', 'skipped', 'error'] as const).includes(l.status as never)
        ? l.status as 'success' | 'partial' | 'skipped' | 'error'
        : 'error',
      message: typeof l.message === 'string' ? l.message : undefined
    }))
    .slice(0, 100)

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
    },
    automation: {
      rules: automationRules,
      logs: automationLogs
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

async function getDiskFreePercent(): Promise<number> {
  try {
    const { stdout } = await execFileAsync('df', ['-k', '/'])
    const lines = stdout.trim().split('\n')
    const dataLine = lines[lines.length - 1]
    const parts = dataLine.split(/\s+/)
    // df -k: blocks(1), used(2), available(3), capacity%(4)
    const capacityStr = parts[4] ?? ''
    const usedPercent = parseInt(capacityStr.replace('%', ''), 10)
    if (!isNaN(usedPercent)) return 100 - usedPercent
  } catch {
    // fall through
  }
  return 100
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
let automationInterval: NodeJS.Timeout | null = null

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

async function checkAndRunAutomations(handlers: ReturnType<typeof createIpcHandlers>, getWindow: () => BrowserWindow | null) {
  const settings = await loadScanSettings()
  const now = Date.now()

  for (const rule of settings.automation.rules) {
    if (!rule.enabled) continue
    if (!rule.nextRunAt || rule.nextRunAt > now) continue

    try {
      const log = await handlers.runAutomationRule(rule)

      if (log.mode === 'suggest' && log.itemsFound > 0) {
        const win = getWindow()
        if (win) {
          win.webContents.send('automation-run', log)
        }

        if (Notification.isSupported()) {
          new Notification({
            title: 'Automação: limpeza disponível',
            body: `${rule.name}: ${log.itemsFound} itens prontos para limpeza.`
          }).show()
        }
      } else if (log.mode === 'auto' && log.itemsDeleted > 0) {
        if (Notification.isSupported()) {
          const mb = (log.bytesDeleted / (1024 * 1024)).toFixed(1)
          new Notification({
            title: 'Automação concluída',
            body: `${rule.name}: ${log.itemsDeleted} itens removidos (${mb} MB).`
          }).show()
        }
      }
    } catch {
      // rule execution errors are logged inside runAutomationRule
    }
  }
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  const handlers = createIpcHandlers({
    getHomePath: () => app.getPath('home'),
    getWindow,
    loadScanSettings,
    saveScanSettings,
    addAuthorizedDirectory,
    trashItem: shell.trashItem,
    getDiskFreePercent,
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

  // RF-03: Automation IPC
  ipcMain.handle('automation:get', handlers.getAutomation)
  ipcMain.handle('automation:create-rule', handlers.createAutomationRule)
  ipcMain.handle('automation:update-rule', handlers.updateAutomationRule)
  ipcMain.handle('automation:delete-rule', handlers.deleteAutomationRule)
  ipcMain.handle('automation:toggle-rule', handlers.toggleAutomationRule)
  ipcMain.handle('automation:get-logs', handlers.getAutomationLogs)

  if (reminderInterval) clearInterval(reminderInterval)
  reminderInterval = setInterval(() => {
    void checkAndDispatchReminder(getWindow, handlers)
  }, 60 * 1000)

  if (automationInterval) clearInterval(automationInterval)
  automationInterval = setInterval(() => {
    void checkAndRunAutomations(handlers, getWindow)
  }, 60 * 1000)

  void checkAndDispatchReminder(getWindow, handlers)
  void checkAndRunAutomations(handlers, getWindow)
}
