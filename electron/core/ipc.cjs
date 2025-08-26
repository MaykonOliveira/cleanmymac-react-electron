const { ipcMain, shell } = require('electron')
const sudo = require('sudo-prompt')
const { scanAllCategories } = require('./scanners.cjs')

function registerIpcHandlers(getWindow) {
  ipcMain.handle('scan-all', async () => {
    const win = getWindow()
    const items = await scanAllCategories((p) => {
      if (win) win.webContents.send('scan-progress', p)
    })
    return items
  })

  ipcMain.handle('delete-items', async (_evt, paths) => {
    let deleted = 0, failed = 0
    for (const p of paths) {
      try {
        await shell.trashItem(p)
        deleted++
      } catch (e) {
        try {
          await new Promise((resolve, reject) => {
            const options = { name: 'CleanMyMac Pro (React)' }
            sudo.exec(`rm -rf "${p.replace(/"/g, '\\"')}"`, options, (error) => {
              if (error) reject(error); else resolve()
            })
          })
          deleted++
        } catch {
          failed++
        }
      }
    }
    return { deleted, failed }
  })
}

module.exports = { registerIpcHandlers }


