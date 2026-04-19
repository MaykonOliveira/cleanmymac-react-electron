export type ItemType = 'file' | 'directory'
export type CleanupCategory = 'Cache' | 'Logs' | 'Temporary' | 'Old Downloads' | 'Browser Cache' | 'App Support'
export type ScanProfile = 'quick' | 'safe' | 'complete'
export type RiskLevel = 'low' | 'medium' | 'high'
export type CleanupPreset = 'conservative' | 'balanced' | 'aggressive'
export type ReminderFrequency = 'off' | 'weekly' | 'monthly'

export interface CategoryInfo {
  id: CleanupCategory
  label: string
  tooltip: string
}

export interface CleanupItem {
  id: string
  name: string
  path: string
  size: number
  type: ItemType
  category: CleanupCategory
  lastModified?: number
  safetyScore: number
  riskLevel: RiskLevel
  recommendationReasons: string[]
}

export interface SkippedScanTarget {
  category: CleanupCategory
  path: string
  reason: string
}

export interface ScanResult {
  items: CleanupItem[]
  skipped: SkippedScanTarget[]
}

export interface LocalMetricsSettings {
  enabled: boolean
  totals: {
    scansStarted: number
    scansCompleted: number
    cleanActions: number
    itemsSelected: number
    itemsDeleted: number
  }
  timeline: {
    firstScanAt?: number
    lastScanAt?: number
    lastCleanAt?: number
  }
}

export interface ReminderSettings {
  frequency: ReminderFrequency
  nextReminderAt?: number
  lastReminderSentAt?: number
}

export interface ScanSettings {
  authorizedDirectories: string[]
  scanProfile: ScanProfile
  reminder: ReminderSettings
  metrics: LocalMetricsSettings
}

declare global {
  interface Window {
    cleaner?: {
      scanAll: () => Promise<ScanResult>
      getScanSettings: () => Promise<ScanSettings>
      addAuthorizedDirectory: () => Promise<ScanSettings | null>
      removeAuthorizedDirectory: (path: string) => Promise<ScanSettings>
      setScanProfile: (profile: ScanProfile) => Promise<ScanSettings>
      setReminderFrequency: (frequency: ReminderFrequency) => Promise<ScanSettings>
      setMetricsOptIn: (enabled: boolean) => Promise<ScanSettings>
      trackMetricEvent: (eventName: string, payload?: Record<string, unknown>) => Promise<void>
      deleteItems: (paths: string[]) => Promise<{ deleted: number, failed: { path: string, message: string }[] }>
      onScanProgress: (cb: (progress: number) => void) => () => void
      onReminder: (cb: (payload: { frequency: ReminderFrequency; dueAt: number }) => void) => () => void
    }
  }
}

export const CATEGORY_INFO: Record<CleanupCategory, CategoryInfo> = {
  'Cache': {
    id: 'Cache',
    label: 'Sistema de Cache',
    tooltip: 'Arquivos temporários em cache de aplicativos e sistema que podem ser recriados automaticamente'
  },
  'Logs': {
    id: 'Logs',
    label: 'Arquivos de Log',
    tooltip: 'Registros de atividades do sistema e aplicativos que não são mais necessários'
  },
  'Temporary': {
    id: 'Temporary',
    label: 'Arquivos Temporários',
    tooltip: 'Arquivos criados temporariamente por aplicativos e que podem ser removidos com segurança'
  },
  'Old Downloads': {
    id: 'Old Downloads',
    label: 'Downloads Antigos',
    tooltip: 'Arquivos baixados há muito tempo e que podem não ser mais necessários'
  },
  'Browser Cache': {
    id: 'Browser Cache',
    label: 'Cache do Navegador',
    tooltip: 'Dados temporários dos navegadores web incluindo imagens, scripts e páginas em cache'
  },
  'App Support': {
    id: 'App Support',
    label: 'Dados de Suporte',
    tooltip: 'Arquivos de suporte de aplicativos que podem ser removidos sem afetar a funcionalidade'
  }
}

export const CATEGORY_ORDER: CleanupCategory[] = [
  'Cache', 'Logs', 'Temporary', 'Old Downloads', 'Browser Cache', 'App Support'
]
