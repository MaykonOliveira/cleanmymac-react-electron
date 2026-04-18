import { BrowserWindow } from 'electron'
import path from 'node:path'

export function createMainWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(process.cwd(), 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
}
