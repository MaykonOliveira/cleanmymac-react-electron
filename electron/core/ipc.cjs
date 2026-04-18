const { ipcMain, shell, dialog, app } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const { SCAN_PROFILES, scanAllCategories } = require('./scanners.cjs')

const DEFAULT_SETTINGS = {
  authorizedDirectories: [app.getPath('home')],
  scanProfile: 'safe'
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'scan-settings.json')
}

async function loadScanSettings() {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf-8')
    const parsed = JSON.parse(raw)
    const authorizedDirectories = Array.isArray(parsed.authorizedDirectories)
      ? parsed.authorizedDirectories.filter((entry) => typeof entry === 'string')
      : DEFAULT_SETTINGS.authorizedDirectories
    const scanProfile = Object.hasOwn(SCAN_PROFILES, parsed.scanProfile) ? parsed.scanProfile : DEFAULT_SETTINGS.scanProfile
    return { authorizedDirectories, scanProfile }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

async function saveScanSettings(settings) {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
  return settings
}

async function addAuthorizedDirectory() {
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

function registerIpcHandlers(getWindow) {
  ipcMain.handle('scan-all', async () => {
    const win = getWindow()
    const settings = await loadScanSettings()

    return scanAllCategories({
      allowedRoots: settings.authorizedDirectories,
      profile: settings.scanProfile,
      onProgress: (p) => {
        if (win) win.webContents.send('scan-progress', p)
      }
    })
  })

  ipcMain.handle('scan-settings:get', async () => loadScanSettings())

  ipcMain.handle('scan-settings:add-directory', async () => addAuthorizedDirectory())

  ipcMain.handle('scan-settings:remove-directory', async (_evt, targetPath) => {
    const settings = await loadScanSettings()
    if (typeof targetPath !== 'string') return settings

    const normalizedTarget = path.resolve(targetPath)
    const authorizedDirectories = settings.authorizedDirectories.filter((entry) => path.resolve(entry) !== normalizedTarget)

    return saveScanSettings({
      ...settings,
      authorizedDirectories: authorizedDirectories.length > 0 ? authorizedDirectories : [app.getPath('home')]
    })
  })

  ipcMain.handle('scan-settings:set-profile', async (_evt, profile) => {
    if (!Object.hasOwn(SCAN_PROFILES, profile)) return loadScanSettings()

    const settings = await loadScanSettings()
    return saveScanSettings({
      ...settings,
      scanProfile: profile
    })
  })

  ipcMain.handle('delete-items', async (_evt, paths = []) => {
    const safePaths = Array.isArray(paths) ? paths.filter((p) => typeof p === 'string') : []
    let deleted = 0
    const failed = []

    for (const p of safePaths) {
      try {
        await shell.trashItem(p)
        deleted++
      } catch (error) {
        failed.push({
          path: p,
          message: error instanceof Error
            ? error.message
            : 'Não foi possível mover para a Lixeira. O sistema bloqueou esta remoção.'
        })
      }
    }

    return { deleted, failed }
  })
}

module.exports = { registerIpcHandlers }
