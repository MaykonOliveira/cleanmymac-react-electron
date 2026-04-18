import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { createMainWindow } from './core/window.js'
import { registerIpcHandlers } from './core/ipc.js'

const isDev = !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL
let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = createMainWindow()

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
    return
  }

  const indexHtml = path.join(process.cwd(), 'dist', 'index.html')
  await mainWindow.loadFile(indexHtml)
}

app.whenReady().then(async () => {
  await createWindow()
  registerIpcHandlers(() => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
