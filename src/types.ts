export type ItemType = 'file' | 'directory'
export type CleanupCategory = 'Cache' | 'Logs' | 'Temporary' | 'Old Downloads' | 'Browser Cache' | 'App Support'
export type ScanProfile = 'quick' | 'safe' | 'complete'

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

export interface ScanSettings {
  authorizedDirectories: string[]
  scanProfile: ScanProfile
}

declare global {
  interface Window {
    cleaner?: {
      scanAll: () => Promise<ScanResult>
      getScanSettings: () => Promise<ScanSettings>
      addAuthorizedDirectory: () => Promise<ScanSettings | null>
      removeAuthorizedDirectory: (path: string) => Promise<ScanSettings>
      setScanProfile: (profile: ScanProfile) => Promise<ScanSettings>
      deleteItems: (paths: string[]) => Promise<{ deleted: number, failed: { path: string, message: string }[] }>
      onScanProgress: (cb: (progress: number) => void) => () => void
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
