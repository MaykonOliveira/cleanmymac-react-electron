import path from 'node:path'
import { SCAN_PROFILES, scanAllCategories } from './scanners.js'

export type ReminderFrequency = 'off' | 'weekly' | 'monthly'

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

export type ScanSettings = {
  authorizedDirectories: string[]
  scanProfile: keyof typeof SCAN_PROFILES
  reminder: ReminderSettings
  metrics: LocalMetrics
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
  }
}

type LoadScanSettings = () => Promise<ScanSettings>
type SaveScanSettings = (settings: ScanSettings) => Promise<ScanSettings>
type AddAuthorizedDirectory = () => Promise<ScanSettings | null>

type IpcHandlerDependencies = {
  getHomePath: () => string
  getWindow: () => { webContents: { send: (channel: string, payload: number | { frequency: ReminderFrequency; dueAt: number }) => void } } | null
  loadScanSettings: LoadScanSettings
  saveScanSettings: SaveScanSettings
  addAuthorizedDirectory: AddAuthorizedDirectory
  runScanAllCategories?: typeof scanAllCategories
  trashItem: (targetPath: string) => Promise<void>
  onSettingsUpdated: (settings: ScanSettings) => void
}

const REMINDER_INTERVAL_MS: Record<Exclude<ReminderFrequency, 'off'>, number> = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
}

function nextReminderTimestamp(frequency: ReminderFrequency, from = Date.now()): number | undefined {
  if (frequency === 'off') return undefined
  return from + REMINDER_INTERVAL_MS[frequency]
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
        recentRuns: settings.metrics.history.slice(0, 5)
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
    }
  }
}
