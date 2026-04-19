import { app, BrowserWindow, Menu, nativeImage, shell, Tray } from 'electron'
import path from 'node:path'
import { createMainWindow } from './core/window.js'
import { registerIpcHandlers } from './core/ipc.js'

const isDev = !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

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

function showMainWindow(): void {
  if (!mainWindow) {
    void createWindow()
    return
  }

  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function sendTrayAction(action: 'scan-quick' | 'scan-safe' | 'scan-complete' | 'reminder-weekly' | 'reminder-monthly' | 'toggle-theme') {
  showMainWindow()
  mainWindow?.webContents.send('tray-action', action)
}

function createTray(): void {
  if (tray) return

  const iconPath = path.join(process.cwd(), 'build', 'icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })

  tray = new Tray(icon)
  tray.setToolTip('CleanMyMac Pro · Limpeza inteligente em 1 clique')

  const contextMenu = Menu.buildFromTemplate([
    { label: '✨ CleanMyMac Pro', enabled: false },
    { type: 'separator' },
    {
      label: '🚀 Executar análise rápida',
      click: () => sendTrayAction('scan-quick')
    },
    {
      label: '🛡️ Executar análise segura',
      click: () => sendTrayAction('scan-safe')
    },
    {
      label: '🔬 Executar análise completa',
      click: () => sendTrayAction('scan-complete')
    },
    { type: 'separator' },
    {
      label: '⏰ Lembrete semanal',
      click: () => sendTrayAction('reminder-weekly')
    },
    {
      label: '📅 Lembrete mensal',
      click: () => sendTrayAction('reminder-monthly')
    },
    {
      label: '🌓 Alternar tema',
      click: () => sendTrayAction('toggle-theme')
    },
    { type: 'separator' },
    {
      label: '📁 Abrir dados do app',
      click: () => {
        void shell.openPath(app.getPath('userData'))
      }
    },
    {
      label: '🪟 Mostrar janela',
      click: () => showMainWindow()
    },
    {
      label: '👋 Fechar CleanMyMac Pro',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', showMainWindow)
}

app.whenReady().then(async () => {
  await createWindow()
  createTray()
  registerIpcHandlers(() => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
      return
    }

    showMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
