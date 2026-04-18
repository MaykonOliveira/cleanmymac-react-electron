import path from 'node:path'
import { SCAN_PROFILES, scanAllCategories } from './scanners.js'

export type ScanSettings = {
  authorizedDirectories: string[]
  scanProfile: keyof typeof SCAN_PROFILES
}

export const DEFAULT_SETTINGS: ScanSettings = {
  authorizedDirectories: [],
  scanProfile: 'safe'
}

type LoadScanSettings = () => Promise<ScanSettings>
type SaveScanSettings = (settings: ScanSettings) => Promise<ScanSettings>
type AddAuthorizedDirectory = () => Promise<ScanSettings | null>

type IpcHandlerDependencies = {
  getHomePath: () => string
  getWindow: () => { webContents: { send: (channel: string, payload: number) => void } } | null
  loadScanSettings: LoadScanSettings
  saveScanSettings: SaveScanSettings
  addAuthorizedDirectory: AddAuthorizedDirectory
  runScanAllCategories?: typeof scanAllCategories
  trashItem: (targetPath: string) => Promise<void>
}

export function createIpcHandlers(deps: IpcHandlerDependencies) {
  const runScan = deps.runScanAllCategories ?? scanAllCategories

  return {
    scanAll: async () => {
      const win = deps.getWindow()
      const settings = await deps.loadScanSettings()

      return runScan({
        allowedRoots: settings.authorizedDirectories,
        profile: settings.scanProfile,
        onProgress: (progress) => {
          win?.webContents.send('scan-progress', progress)
        }
      })
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

      return deps.saveScanSettings({
        ...settings,
        authorizedDirectories: authorizedDirectories.length > 0 ? authorizedDirectories : [deps.getHomePath()]
      })
    },

    setScanProfile: async (_event: unknown, profile: unknown): Promise<ScanSettings> => {
      if (typeof profile !== 'string' || !Object.hasOwn(SCAN_PROFILES, profile)) {
        return deps.loadScanSettings()
      }

      const settings = await deps.loadScanSettings()
      return deps.saveScanSettings({
        ...settings,
        scanProfile: profile as keyof typeof SCAN_PROFILES
      })
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
