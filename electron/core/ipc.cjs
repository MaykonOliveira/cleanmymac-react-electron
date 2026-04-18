const { ipcMain, shell } = require('electron')
const { scanAllCategories } = require('./scanners.cjs')

function registerIpcHandlers(getWindow) {
  ipcMain.handle('scan-all', async () => {
    const win = getWindow()
    const items = await scanAllCategories((p) => {
      if (win) win.webContents.send('scan-progress', p)
    })
    return items
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
