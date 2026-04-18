import { ipcMain, shell, dialog, app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { SCAN_PROFILES, scanAllCategories } from './scanners.js'

const DEFAULT_SETTINGS = {
  authorizedDirectories: [app.getPath('home')],
  scanProfile: 'safe' as const
}

type ScanSettings = {
  authorizedDirectories: string[]
  scanProfile: keyof typeof SCAN_PROFILES
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'scan-settings.json')
}

async function loadScanSettings(): Promise<ScanSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf-8')
    const parsed: { authorizedDirectories?: unknown; scanProfile?: unknown } = JSON.parse(raw)

    const authorizedDirectories = Array.isArray(parsed.authorizedDirectories)
      ? parsed.authorizedDirectories.filter((entry): entry is string => typeof entry === 'string')
      : DEFAULT_SETTINGS.authorizedDirectories

    const scanProfile =
      typeof parsed.scanProfile === 'string' && Object.hasOwn(SCAN_PROFILES, parsed.scanProfile)
        ? (parsed.scanProfile as keyof typeof SCAN_PROFILES)
        : DEFAULT_SETTINGS.scanProfile

    return { authorizedDirectories, scanProfile }
  } catch {
    return { ...DEFAULT_SETTINGS }
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

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('scan-all', async () => {
    const win = getWindow()
    const settings = await loadScanSettings()

    return scanAllCategories({
      allowedRoots: settings.authorizedDirectories,
      profile: settings.scanProfile,
      onProgress: (progress) => {
        if (win) win.webContents.send('scan-progress', progress)
      }
    })
  })

  ipcMain.handle('scan-settings:get', async () => loadScanSettings())

  ipcMain.handle('scan-settings:add-directory', async () => addAuthorizedDirectory())

  ipcMain.handle('scan-settings:remove-directory', async (_event, targetPath: unknown) => {
    const settings = await loadScanSettings()
    if (typeof targetPath !== 'string') return settings

    const normalizedTarget = path.resolve(targetPath)
    const authorizedDirectories = settings.authorizedDirectories.filter((entry) => path.resolve(entry) !== normalizedTarget)

    return saveScanSettings({
      ...settings,
      authorizedDirectories: authorizedDirectories.length > 0 ? authorizedDirectories : [app.getPath('home')]
    })
  })

  ipcMain.handle('scan-settings:set-profile', async (_event, profile: unknown) => {
    if (typeof profile !== 'string' || !Object.hasOwn(SCAN_PROFILES, profile)) {
      return loadScanSettings()
    }

    const settings = await loadScanSettings()
    return saveScanSettings({
      ...settings,
      scanProfile: profile as keyof typeof SCAN_PROFILES
    })
  })

  ipcMain.handle('delete-items', async (_event, paths: unknown) => {
    const safePaths = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string') : []
    let deleted = 0
    const failed: Array<{ path: string; message: string }> = []

    for (const targetPath of safePaths) {
      try {
        await shell.trashItem(targetPath)
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
  })
}
