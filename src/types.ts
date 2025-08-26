export type ItemType = 'file' | 'directory'
export type CleanupCategory = 'Cache' | 'Logs' | 'Temporary' | 'Old Downloads' | 'Browser Cache' | 'App Support'

export interface CleanupItem {
  id: string
  name: string
  path: string
  size: number
  type: ItemType
  category: CleanupCategory
  lastModified?: number
}

declare global {
  interface Window {
    cleaner?: {
      scanAll: () => Promise<CleanupItem[]>
      deleteItems: (paths: string[]) => Promise<{ deleted: number, failed: number }>
      onScanProgress: (cb: (progress: number) => void) => () => void
    }
  }
}

export const CATEGORY_ORDER: CleanupCategory[] = [
  'Cache', 'Logs', 'Temporary', 'Old Downloads', 'Browser Cache', 'App Support'
]


