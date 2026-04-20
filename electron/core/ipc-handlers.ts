import path from 'node:path'
import { SCAN_PROFILES, scanAllCategories } from './scanners.js'
import { getDiskSpace } from './fs.js'

export type ReminderFrequency = 'off' | 'weekly' | 'monthly'
export type AutomationFrequency = 'daily' | 'weekly' | 'monthly'
export type AutomationMode = 'suggest' | 'auto'

export type LocalMetrics = {
  enabled: boolean
  totals: {
    scansStarted: number
    scansCompleted: number
    cleanActions: number
    itemsSelected: number
    itemsDeleted: number
    bytesDeleted: number
  }
  timeline: {
    firstScanAt?: number
    lastScanAt?: number
    lastCleanAt?: number
  }
  history: Array<{
    at: number
    deletedCount: number
    failedCount: number
    deletedBytes: number
    deletedByCategory: Partial<Record<(typeof SCAN_PROFILES)[keyof typeof SCAN_PROFILES][number], number>>
  }>
}

export type ReminderSettings = {
  frequency: ReminderFrequency
  nextReminderAt?: number
  lastReminderSentAt?: number
}

export type AutomationRule = {
  id: string
  name: string
  enabled: boolean
  frequency: AutomationFrequency
  windowHour: number
  diskThresholdPercent: number
  mode: AutomationMode
  profile: keyof typeof SCAN_PROFILES
  createdAt: number
  lastRunAt?: number
  nextRunAt?: number
}

export type AutomationRunLog = {
  ruleId: string
  ruleName: string
  at: number
  mode: AutomationMode
  itemsFound: number
  itemsDeleted: number
  bytesDeleted: number
  status: 'success' | 'partial' | 'skipped' | 'error'
  message?: string
}

export type AutomationSettings = {
  rules: AutomationRule[]
  logs: AutomationRunLog[]
}

export type ScanSettings = {
  authorizedDirectories: string[]
  scanProfile: keyof typeof SCAN_PROFILES
  reminder: ReminderSettings
  metrics: LocalMetrics
  automation: AutomationSettings
}

export const DEFAULT_AUTOMATION: AutomationSettings = {
  rules: [],
  logs: []
}

export const DEFAULT_SETTINGS: ScanSettings = {
  authorizedDirectories: [],
  scanProfile: 'safe',
  reminder: {
    frequency: 'off'
  },
  metrics: {
    enabled: false,
    totals: {
      scansStarted: 0,
      scansCompleted: 0,
      cleanActions: 0,
      itemsSelected: 0,
      itemsDeleted: 0,
      bytesDeleted: 0
    },
    timeline: {},
    history: []
  },
  automation: DEFAULT_AUTOMATION
}

type LoadScanSettings = () => Promise<ScanSettings>
type SaveScanSettings = (settings: ScanSettings) => Promise<ScanSettings>
type AddAuthorizedDirectory = () => Promise<ScanSettings | null>

type IpcHandlerDependencies = {
  getHomePath: () => string
  getWindow: () => { webContents: { send: (channel: string, payload: unknown) => void } } | null
  loadScanSettings: LoadScanSettings
  saveScanSettings: SaveScanSettings
  addAuthorizedDirectory: AddAuthorizedDirectory
  runScanAllCategories?: typeof scanAllCategories
  trashItem: (targetPath: string) => Promise<void>
  onSettingsUpdated: (settings: ScanSettings) => void
  getDiskFreePercent?: () => Promise<number>
}

const REMINDER_INTERVAL_MS: Record<Exclude<ReminderFrequency, 'off'>, number> = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
}

const AUTOMATION_INTERVAL_MS: Record<AutomationFrequency, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
}

function nextReminderTimestamp(frequency: ReminderFrequency, from = Date.now()): number | undefined {
  if (frequency === 'off') return undefined
  return from + REMINDER_INTERVAL_MS[frequency]
}

function nextAutomationTimestamp(frequency: AutomationFrequency, windowHour: number, from = Date.now()): number {
  const base = from + AUTOMATION_INTERVAL_MS[frequency]
  const d = new Date(base)
  d.setHours(windowHour, 0, 0, 0)
  return d.getTime()
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function withUpdatedMetricTotals(current: ScanSettings, updater: (metrics: LocalMetrics) => LocalMetrics): ScanSettings {
  return {
    ...current,
    metrics: updater(current.metrics)
  }
}

export function createIpcHandlers(deps: IpcHandlerDependencies) {
  const runScan = deps.runScanAllCategories ?? scanAllCategories

  return {
    scanAll: async () => {
      const win = deps.getWindow()
      const settings = await deps.loadScanSettings()
      const startedAt = Date.now()

      if (settings.metrics.enabled) {
        const updatedStart = withUpdatedMetricTotals(settings, (metrics) => ({
          ...metrics,
          totals: {
            ...metrics.totals,
            scansStarted: metrics.totals.scansStarted + 1
          },
          timeline: {
            ...metrics.timeline,
            firstScanAt: metrics.timeline.firstScanAt ?? startedAt,
            lastScanAt: startedAt
          }
        }))
        await deps.saveScanSettings(updatedStart)
      }

      const result = await runScan({
        allowedRoots: settings.authorizedDirectories,
        profile: settings.scanProfile,
        onProgress: (progress) => {
          win?.webContents.send('scan-progress', progress)
        }
      })

      const refreshed = await deps.loadScanSettings()
      if (refreshed.metrics.enabled) {
        const completedAt = Date.now()
        const updatedComplete = withUpdatedMetricTotals(refreshed, (metrics) => ({
          ...metrics,
          totals: {
            ...metrics.totals,
            scansCompleted: metrics.totals.scansCompleted + 1
          },
          timeline: {
            ...metrics.timeline,
            firstScanAt: metrics.timeline.firstScanAt ?? completedAt,
            lastScanAt: completedAt
          }
        }))
        await deps.saveScanSettings(updatedComplete)
      }

      return result
    },

    getScanSettings: async (): Promise<ScanSettings> => deps.loadScanSettings(),

    addScanDirectory: async (): Promise<ScanSettings | null> => deps.addAuthorizedDirectory(),

    removeScanDirectory: async (_event: unknown, targetPath: unknown): Promise<ScanSettings> => {
      const settings = await deps.loadScanSettings()
      if (typeof targetPath !== 'string') return settings

      const normalizedTarget = path.resolve(targetPath)
      const authorizedDirectories = settings.authorizedDirectories.filter(
        (entry) => path.resolve(entry) !== normalizedTarget
      )

      const next = {
        ...settings,
        authorizedDirectories: authorizedDirectories.length > 0 ? authorizedDirectories : [deps.getHomePath()]
      }

      const saved = await deps.saveScanSettings(next)
      deps.onSettingsUpdated(saved)
      return saved
    },

    setScanProfile: async (_event: unknown, profile: unknown): Promise<ScanSettings> => {
      if (typeof profile !== 'string' || !Object.hasOwn(SCAN_PROFILES, profile)) {
        return deps.loadScanSettings()
      }

      const settings = await deps.loadScanSettings()
      const saved = await deps.saveScanSettings({
        ...settings,
        scanProfile: profile as keyof typeof SCAN_PROFILES
      })
      deps.onSettingsUpdated(saved)
      return saved
    },

    setReminderFrequency: async (_event: unknown, frequency: unknown): Promise<ScanSettings> => {
      if (frequency !== 'off' && frequency !== 'weekly' && frequency !== 'monthly') {
        return deps.loadScanSettings()
      }

      const settings = await deps.loadScanSettings()
      const saved = await deps.saveScanSettings({
        ...settings,
        reminder: {
          frequency,
          nextReminderAt: nextReminderTimestamp(frequency),
          lastReminderSentAt: settings.reminder.lastReminderSentAt
        }
      })
      deps.onSettingsUpdated(saved)
      return saved
    },

    setMetricsOptIn: async (_event: unknown, enabled: unknown): Promise<ScanSettings> => {
      if (typeof enabled !== 'boolean') return deps.loadScanSettings()

      const settings = await deps.loadScanSettings()
      const saved = await deps.saveScanSettings({
        ...settings,
        metrics: {
          ...settings.metrics,
          enabled
        }
      })
      deps.onSettingsUpdated(saved)
      return saved
    },

    trackMetricEvent: async (_event: unknown, eventName: unknown, payload: unknown): Promise<void> => {
      if (typeof eventName !== 'string') return
      const settings = await deps.loadScanSettings()
      if (!settings.metrics.enabled) return

      const safePayload = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}

      let updated = settings
      if (eventName === 'selection_changed') {
        const selectedCount = typeof safePayload.selectedCount === 'number' ? Math.max(0, Math.floor(safePayload.selectedCount)) : 0
        updated = withUpdatedMetricTotals(updated, (metrics) => ({
          ...metrics,
          totals: {
            ...metrics.totals,
            itemsSelected: Math.max(metrics.totals.itemsSelected, selectedCount)
          }
        }))
      }

      if (eventName === 'clean_triggered') {
        const selectedCount = typeof safePayload.selectedCount === 'number' ? Math.max(0, Math.floor(safePayload.selectedCount)) : 0
        updated = withUpdatedMetricTotals(updated, (metrics) => ({
          ...metrics,
          totals: {
            ...metrics.totals,
            cleanActions: metrics.totals.cleanActions + 1,
            itemsSelected: metrics.totals.itemsSelected + selectedCount
          },
          timeline: {
            ...metrics.timeline,
            lastCleanAt: Date.now()
          }
        }))
      }

      if (eventName === 'clean_completed') {
        const deletedCount = typeof safePayload.deletedCount === 'number' ? Math.max(0, Math.floor(safePayload.deletedCount)) : 0
        const failedCount = typeof safePayload.failedCount === 'number' ? Math.max(0, Math.floor(safePayload.failedCount)) : 0
        const deletedBytes = typeof safePayload.deletedBytes === 'number' ? Math.max(0, Math.floor(safePayload.deletedBytes)) : 0
        const deletedByCategory = safePayload.deletedByCategory && typeof safePayload.deletedByCategory === 'object'
          ? safePayload.deletedByCategory as Record<string, unknown>
          : {}
        const normalizedByCategory = Object.entries(deletedByCategory).reduce<Record<string, number>>((acc, [key, value]) => {
          if (typeof value === 'number' && value > 0) acc[key] = Math.floor(value)
          return acc
        }, {})

        updated = withUpdatedMetricTotals(updated, (metrics) => ({
          ...metrics,
          totals: {
            ...metrics.totals,
            itemsDeleted: metrics.totals.itemsDeleted + deletedCount,
            bytesDeleted: metrics.totals.bytesDeleted + deletedBytes
          },
          history: [
            {
              at: Date.now(),
              deletedCount,
              failedCount,
              deletedBytes,
              deletedByCategory: normalizedByCategory
            },
            ...metrics.history
          ].slice(0, 30)
        }))
      }

      await deps.saveScanSettings(updated)
    },

    getCleanupInsights: async () => {
      const settings = await deps.loadScanSettings()
      return {
        totals: {
          cleanActions: settings.metrics.totals.cleanActions,
          itemsDeleted: settings.metrics.totals.itemsDeleted,
          bytesDeleted: settings.metrics.totals.bytesDeleted
        },
        timeline: settings.metrics.timeline,
        recentRuns: settings.metrics.history.slice(0, 5),
        allHistory: settings.metrics.history,
        diskSpace: getDiskSpace()
      }
    },

    markReminderSent: async (): Promise<void> => {
      const settings = await deps.loadScanSettings()
      if (settings.reminder.frequency === 'off') return

      const now = Date.now()
      const saved = await deps.saveScanSettings({
        ...settings,
        reminder: {
          ...settings.reminder,
          lastReminderSentAt: now,
          nextReminderAt: nextReminderTimestamp(settings.reminder.frequency, now)
        }
      })
      deps.onSettingsUpdated(saved)
    },

    deleteItems: async (_event: unknown, paths: unknown): Promise<{ deleted: number; failed: Array<{ path: string; message: string }> }> => {
      const safePaths = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string') : []
      let deleted = 0
      const failed: Array<{ path: string; message: string }> = []

      for (const targetPath of safePaths) {
        try {
          await deps.trashItem(targetPath)
          deleted++
        } catch (error) {
          failed.push({
            path: targetPath,
            message:
              error instanceof Error
                ? error.message
                : 'Não foi possível mover para a Lixeira. O sistema bloqueou esta remoção.'
          })
        }
      }

      return { deleted, failed }
    },

    // RF-03: Automation handlers

    getAutomation: async (): Promise<AutomationSettings> => {
      const settings = await deps.loadScanSettings()
      return settings.automation
    },

    createAutomationRule: async (_event: unknown, ruleData: unknown): Promise<AutomationSettings> => {
      const settings = await deps.loadScanSettings()
      const data = ruleData && typeof ruleData === 'object' ? ruleData as Record<string, unknown> : {}

      const frequency: AutomationFrequency =
        data.frequency === 'daily' || data.frequency === 'weekly' || data.frequency === 'monthly'
          ? data.frequency
          : 'weekly'

      const mode: AutomationMode = data.mode === 'auto' || data.mode === 'suggest' ? data.mode : 'suggest'

      const profile =
        typeof data.profile === 'string' && Object.hasOwn(SCAN_PROFILES, data.profile)
          ? (data.profile as keyof typeof SCAN_PROFILES)
          : settings.scanProfile

      const windowHour = typeof data.windowHour === 'number'
        ? Math.max(0, Math.min(23, Math.floor(data.windowHour)))
        : 3

      const diskThresholdPercent = typeof data.diskThresholdPercent === 'number'
        ? Math.max(0, Math.min(100, Math.floor(data.diskThresholdPercent)))
        : 0

      const now = Date.now()
      const newRule: AutomationRule = {
        id: generateId(),
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Nova automação',
        enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
        frequency,
        windowHour,
        diskThresholdPercent,
        mode,
        profile,
        createdAt: now,
        nextRunAt: nextAutomationTimestamp(frequency, windowHour, now)
      }

      const saved = await deps.saveScanSettings({
        ...settings,
        automation: {
          ...settings.automation,
          rules: [...settings.automation.rules, newRule]
        }
      })

      deps.onSettingsUpdated(saved)
      return saved.automation
    },

    updateAutomationRule: async (_event: unknown, id: unknown, patch: unknown): Promise<AutomationSettings> => {
      if (typeof id !== 'string') return (await deps.loadScanSettings()).automation
      const settings = await deps.loadScanSettings()
      const data = patch && typeof patch === 'object' ? patch as Record<string, unknown> : {}

      const rules = settings.automation.rules.map((rule) => {
        if (rule.id !== id) return rule

        const frequency: AutomationFrequency =
          data.frequency === 'daily' || data.frequency === 'weekly' || data.frequency === 'monthly'
            ? data.frequency
            : rule.frequency

        const mode: AutomationMode = data.mode === 'auto' || data.mode === 'suggest' ? data.mode : rule.mode

        const profile =
          typeof data.profile === 'string' && Object.hasOwn(SCAN_PROFILES, data.profile)
            ? (data.profile as keyof typeof SCAN_PROFILES)
            : rule.profile

        const windowHour = typeof data.windowHour === 'number'
          ? Math.max(0, Math.min(23, Math.floor(data.windowHour)))
          : rule.windowHour

        const diskThresholdPercent = typeof data.diskThresholdPercent === 'number'
          ? Math.max(0, Math.min(100, Math.floor(data.diskThresholdPercent)))
          : rule.diskThresholdPercent

        const updated: AutomationRule = {
          ...rule,
          frequency,
          mode,
          profile,
          windowHour,
          diskThresholdPercent,
          name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : rule.name,
          enabled: typeof data.enabled === 'boolean' ? data.enabled : rule.enabled
        }

        if (data.frequency && data.frequency !== rule.frequency) {
          updated.nextRunAt = nextAutomationTimestamp(frequency, windowHour)
        }

        return updated
      })

      const saved = await deps.saveScanSettings({
        ...settings,
        automation: { ...settings.automation, rules }
      })

      deps.onSettingsUpdated(saved)
      return saved.automation
    },

    deleteAutomationRule: async (_event: unknown, id: unknown): Promise<AutomationSettings> => {
      if (typeof id !== 'string') return (await deps.loadScanSettings()).automation
      const settings = await deps.loadScanSettings()

      const saved = await deps.saveScanSettings({
        ...settings,
        automation: {
          ...settings.automation,
          rules: settings.automation.rules.filter((r) => r.id !== id)
        }
      })

      deps.onSettingsUpdated(saved)
      return saved.automation
    },

    toggleAutomationRule: async (_event: unknown, id: unknown, enabled: unknown): Promise<AutomationSettings> => {
      if (typeof id !== 'string' || typeof enabled !== 'boolean') {
        return (await deps.loadScanSettings()).automation
      }
      const settings = await deps.loadScanSettings()

      const rules = settings.automation.rules.map((rule) =>
        rule.id === id ? { ...rule, enabled } : rule
      )

      const saved = await deps.saveScanSettings({
        ...settings,
        automation: { ...settings.automation, rules }
      })

      deps.onSettingsUpdated(saved)
      return saved.automation
    },

    getAutomationLogs: async (): Promise<AutomationRunLog[]> => {
      const settings = await deps.loadScanSettings()
      return settings.automation.logs
    },

    runAutomationRule: async (rule: AutomationRule): Promise<AutomationRunLog> => {
      const win = deps.getWindow()
      const settings = await deps.loadScanSettings()
      const now = Date.now()

      // Check disk threshold
      if (rule.diskThresholdPercent > 0 && deps.getDiskFreePercent) {
        const freePercent = await deps.getDiskFreePercent()
        if (freePercent >= rule.diskThresholdPercent) {
          const log: AutomationRunLog = {
            ruleId: rule.id,
            ruleName: rule.name,
            at: now,
            mode: rule.mode,
            itemsFound: 0,
            itemsDeleted: 0,
            bytesDeleted: 0,
            status: 'skipped',
            message: `Espaço livre (${Math.round(freePercent)}%) acima do limite (${rule.diskThresholdPercent}%)`
          }

          await deps.saveScanSettings({
            ...settings,
            automation: {
              ...settings.automation,
              logs: [log, ...settings.automation.logs].slice(0, 100),
              rules: settings.automation.rules.map((r) =>
                r.id === rule.id
                  ? { ...r, lastRunAt: now, nextRunAt: nextAutomationTimestamp(rule.frequency, rule.windowHour, now) }
                  : r
              )
            }
          })

          return log
        }
      }

      // Run scan
      const scanResult = await runScan({
        allowedRoots: settings.authorizedDirectories,
        profile: rule.profile,
        onProgress: (progress) => {
          win?.webContents.send('scan-progress', progress)
        }
      })

      // Only low-risk items eligible for auto mode
      const eligible = scanResult.items.filter((item) => item.riskLevel === 'low')

      let itemsDeleted = 0
      let bytesDeleted = 0
      let status: AutomationRunLog['status'] = 'success'
      let message: string | undefined

      if (rule.mode === 'auto' && eligible.length > 0) {
        const failed: string[] = []

        for (const item of eligible) {
          try {
            await deps.trashItem(item.path)
            itemsDeleted++
            bytesDeleted += item.size
          } catch {
            failed.push(item.path)
          }
        }

        if (failed.length > 0 && itemsDeleted === 0) {
          status = 'error'
          message = `Falha ao remover ${failed.length} itens`
        } else if (failed.length > 0) {
          status = 'partial'
          message = `${failed.length} itens bloqueados pelo sistema`
        }
      } else if (rule.mode === 'suggest') {
        message = `${eligible.length} itens prontos para limpeza`
      }

      const log: AutomationRunLog = {
        ruleId: rule.id,
        ruleName: rule.name,
        at: now,
        mode: rule.mode,
        itemsFound: scanResult.items.length,
        itemsDeleted,
        bytesDeleted,
        status,
        message
      }

      const refreshed = await deps.loadScanSettings()
      const saved = await deps.saveScanSettings({
        ...refreshed,
        automation: {
          ...refreshed.automation,
          logs: [log, ...refreshed.automation.logs].slice(0, 100),
          rules: refreshed.automation.rules.map((r) =>
            r.id === rule.id
              ? { ...r, lastRunAt: now, nextRunAt: nextAutomationTimestamp(rule.frequency, rule.windowHour, now) }
              : r
          )
        }
      })

      deps.onSettingsUpdated(saved)

      // Notify renderer
      if (win) {
        win.webContents.send('automation-run', log)
      }

      return log
    }
  }
}
