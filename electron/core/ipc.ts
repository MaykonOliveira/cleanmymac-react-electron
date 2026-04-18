import { ipcMain, shell, dialog, app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { SCAN_PROFILES } from './scanners.js'
import { createIpcHandlers, DEFAULT_SETTINGS, type ScanSettings } from './ipc-handlers.js'

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'scan-settings.json')
}

async function loadScanSettings(): Promise<ScanSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf-8')
    const parsed: { authorizedDirectories?: unknown; scanProfile?: unknown } = JSON.parse(raw)

    const authorizedDirectories = Array.isArray(parsed.authorizedDirectories)
      ? parsed.authorizedDirectories.filter((entry): entry is string => typeof entry === 'string')
      : [app.getPath('home')]

    const scanProfile =
      typeof parsed.scanProfile === 'string' && Object.hasOwn(SCAN_PROFILES, parsed.scanProfile)
        ? (parsed.scanProfile as keyof typeof SCAN_PROFILES)
        : DEFAULT_SETTINGS.scanProfile

    return { authorizedDirectories, scanProfile }
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      authorizedDirectories: [app.getPath('home')]
    }
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
  const handlers = createIpcHandlers({
    getHomePath: () => app.getPath('home'),
    getWindow,
    loadScanSettings,
    saveScanSettings,
    addAuthorizedDirectory,
    trashItem: shell.trashItem
  })

  ipcMain.handle('scan-all', handlers.scanAll)
  ipcMain.handle('scan-settings:get', handlers.getScanSettings)
  ipcMain.handle('scan-settings:add-directory', handlers.addScanDirectory)
  ipcMain.handle('scan-settings:remove-directory', handlers.removeScanDirectory)
  ipcMain.handle('scan-settings:set-profile', handlers.setScanProfile)
  ipcMain.handle('delete-items', handlers.deleteItems)
}
