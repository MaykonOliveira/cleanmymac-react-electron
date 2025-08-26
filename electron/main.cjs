// electron/main.cjs
const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const { createMainWindow } = require('./core/window.cjs')
const { registerIpcHandlers } = require('./core/ipc.cjs')

const isDev = !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL
let mainWindow = null

async function createWindow() {
  mainWindow = createMainWindow(isDev)
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
    await mainWindow.loadFile(indexHtml)
  }
}

app.whenReady().then(async () => {
  await createWindow()
  registerIpcHandlers(() => mainWindow)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
// scanners, fs helpers and ipc moved to electron/core
