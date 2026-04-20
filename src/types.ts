export type ItemType = 'file' | 'directory'
export type CleanupCategory = 'Cache' | 'Logs' | 'Temporary' | 'Old Downloads' | 'Browser Cache' | 'App Support'
export type ScanProfile = 'quick' | 'safe' | 'complete'
export type RiskLevel = 'low' | 'medium' | 'high'
export type CleanupPreset = 'conservative' | 'balanced' | 'aggressive'
export type ReminderFrequency = 'off' | 'weekly' | 'monthly'
export type TrayAction = 'scan-quick' | 'scan-safe' | 'scan-complete' | 'reminder-weekly' | 'reminder-monthly' | 'toggle-theme'
export type AutomationFrequency = 'daily' | 'weekly' | 'monthly'
export type AutomationMode = 'suggest' | 'auto'

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
    bytesDeleted: number
  }
  timeline: {
    firstScanAt?: number
    lastScanAt?: number
    lastCleanAt?: number
  }
  history: CleanupRunSummary[]
}

export interface CleanupRunSummary {
  at: number
  deletedCount: number
  failedCount: number
  deletedBytes: number
  deletedByCategory: Partial<Record<CleanupCategory, number>>
}

export interface CleanupInsights {
  totals: {
    cleanActions: number
    itemsDeleted: number
    bytesDeleted: number
  }
  timeline: {
    firstScanAt?: number
    lastScanAt?: number
    lastCleanAt?: number
  }
  recentRuns: CleanupRunSummary[]
}

export interface ReminderSettings {
  frequency: ReminderFrequency
  nextReminderAt?: number
  lastReminderSentAt?: number
}

export interface AutomationRule {
  id: string
  name: string
  enabled: boolean
  frequency: AutomationFrequency
  /** Hour of day 0-23 to run (local time) */
  windowHour: number
  /** Trigger when free disk space percent drops below this value (0 = disabled) */
  diskThresholdPercent: number
  mode: AutomationMode
  profile: ScanProfile
  createdAt: number
  lastRunAt?: number
  nextRunAt?: number
}

export interface AutomationRunLog {
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

export interface AutomationSettings {
  rules: AutomationRule[]
  logs: AutomationRunLog[]
}

export const AUTOMATION_TEMPLATES: Array<{
  id: string
  name: string
  description: string
  rule: Omit<AutomationRule, 'id' | 'createdAt'>
}> = [
  {
    id: 'weekly-safe',
    name: 'Limpeza semanal segura',
    description: 'Toda semana de madrugada — apenas itens de baixo risco',
    rule: {
      name: 'Limpeza semanal segura',
      enabled: true,
      frequency: 'weekly',
      windowHour: 3,
      diskThresholdPercent: 0,
      mode: 'auto',
      profile: 'safe'
    }
  },
  {
    id: 'monthly-complete',
    name: 'Limpeza mensal completa',
    description: 'Todo mês — análise completa com sugestão para revisão',
    rule: {
      name: 'Limpeza mensal completa',
      enabled: true,
      frequency: 'monthly',
      windowHour: 2,
      diskThresholdPercent: 0,
      mode: 'suggest',
      profile: 'complete'
    }
  },
  {
    id: 'disk-pressure',
    name: 'Alerta de espaço em disco',
    description: 'Sugere limpeza quando disco livre cair abaixo de 15%',
    rule: {
      name: 'Alerta de espaço em disco',
      enabled: true,
      frequency: 'daily',
      windowHour: 10,
      diskThresholdPercent: 15,
      mode: 'suggest',
      profile: 'quick'
    }
  }
]

export interface ScanSettings {
  authorizedDirectories: string[]
  scanProfile: ScanProfile
  reminder: ReminderSettings
  metrics: LocalMetricsSettings
  automation: AutomationSettings
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
      getCleanupInsights: () => Promise<CleanupInsights>
      deleteItems: (paths: string[]) => Promise<{ deleted: number, failed: { path: string, message: string }[] }>
      // RF-03 automation
      getAutomation: () => Promise<AutomationSettings>
      createAutomationRule: (rule: Omit<AutomationRule, 'id' | 'createdAt'>) => Promise<AutomationSettings>
      updateAutomationRule: (id: string, patch: Partial<Omit<AutomationRule, 'id' | 'createdAt'>>) => Promise<AutomationSettings>
      deleteAutomationRule: (id: string) => Promise<AutomationSettings>
      toggleAutomationRule: (id: string, enabled: boolean) => Promise<AutomationSettings>
      getAutomationLogs: () => Promise<AutomationRunLog[]>
      onScanProgress: (cb: (progress: number) => void) => () => void
      onReminder: (cb: (payload: { frequency: ReminderFrequency; dueAt: number }) => void) => () => void
      onTrayAction: (cb: (action: TrayAction) => void) => () => void
      onAutomationRun: (cb: (log: AutomationRunLog) => void) => () => void
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
