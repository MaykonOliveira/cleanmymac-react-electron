// Electron main process
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import fscore from 'node:fs'
import os from 'node:os'
import { v4 as uuidv4 } from 'uuid'
import trash from 'trash'
import sudo from 'sudo-prompt'

type ItemType = 'file' | 'directory'
type CleanupCategory = 'Cache' | 'Logs' | 'Temporary' | 'Old Downloads' | 'Browser Cache' | 'App Support'

interface CleanupItem {
  id: string
  name: string
  path: string
  size: number
  type: ItemType
  category: CleanupCategory
  lastModified?: number
}

const isMac = process.platform === 'darwin'
const isDev = !!process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(process.cwd(), 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(path.join(process.cwd(), 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---------- FS Helpers ----------

async function getDirectorySize(targetPath: string): Promise<number> {
  let total = 0
  async function walk(p: string) {
    try {
      const dir = await fs.opendir(p)
      for await (const dirent of dir) {
        const child = path.join(p, dirent.name)
        try {
          const stat = await fs.lstat(child)
          if (stat.isDirectory()) {
            await walk(child)
          } else {
            total += stat.size
          }
        } catch { /* ignore per-file errors */ }
      }
    } catch { /* permission or missing */ }
  }
  await walk(targetPath)
  return total
}

async function listDirectoryOnce(dir: string) {
  try {
    const names = await fs.readdir(dir, { withFileTypes: true })
    return names.map(d => ({ name: d.name, isDir: d.isDirectory(), full: path.join(dir, d.name) }))
  } catch {
    return []
  }
}

async function statSafe(p: string) {
  try {
    return await fs.lstat(p)
  } catch {
    return null
  }
}

function olderThan(statMtimeMs: number | undefined, cutoff: number) {
  if (!statMtimeMs) return false
  return statMtimeMs < cutoff
}

// ---------- Scanners ----------

async function scanCache(): Promise<CleanupItem[]> {
  const home = os.homedir()
  const targets = [
    path.join(home, 'Library', 'Caches'),
    '/Library/Caches'
  ]
  return scanGroup(targets, 'Cache')
}

async function scanLogs(): Promise<CleanupItem[]> {
  const home = os.homedir()
  const targets = [
    path.join(home, 'Library', 'Logs'),
    '/Library/Logs'
  ]
  return scanGroup(targets, 'Logs', { extensions: ['log', 'txt'] })
}

async function scanTemporary(): Promise<CleanupItem[]> {
  const home = os.homedir()
  const targets = [
    '/tmp',
    path.join(home, '.Trash')
  ]
  return scanGroup(targets, 'Temporary')
}

async function scanOldDownloads(): Promise<CleanupItem[]> {
  const home = os.homedir()
  const downloads = path.join(home, 'Downloads')
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
  return scanGroup([downloads], 'Old Downloads', { olderThanMs: cutoff })
}

async function scanBrowserCache(): Promise<CleanupItem[]> {
  const home = os.homedir()
  const targets = [
    path.join(home, 'Library', 'Caches', 'com.apple.Safari'),
    path.join(home, 'Library', 'Caches', 'Google', 'Chrome'),
    path.join(home, 'Library', 'Caches', 'Firefox')
  ]
  return scanGroup(targets, 'Browser Cache')
}

async function scanAppSupport(): Promise<CleanupItem[]> {
  const home = os.homedir()
  const targets = [
    path.join(home, 'Library', 'Application Support')
  ]
  return scanGroup(targets, 'App Support', { minSize: 10 * 1024 * 1024 })
}

interface ScanOpts {
  extensions?: string[]
  olderThanMs?: number
  minSize?: number
}

async function scanGroup(dirs: string[], category: CleanupCategory, opts: ScanOpts = {}): Promise<CleanupItem[]> {
  const out: CleanupItem[] = []
  for (const dir of dirs) {
    const items = await listDirectoryOnce(dir)
    for (const entry of items) {
      const st = await statSafe(entry.full)
      if (!st) continue

      // extension filter
      if (opts.extensions && !entry.isDir) {
        const ext = path.extname(entry.name).toLowerCase().replace('.', '')
        if (!opts.extensions.includes(ext)) continue
      }

      // olderThan filter
      if (opts.olderThanMs && st.mtimeMs && !olderThan(st.mtimeMs, opts.olderThanMs)) {
        continue
      }

      let size = st.size
      if (entry.isDir) {
        size = await getDirectorySize(entry.full)
      }
      if (opts.minSize && size < opts.minSize) continue

      out.push({
        id: uuidv4(),
        name: entry.name,
        path: entry.full,
        size,
        type: entry.isDir ? 'directory' : 'file',
        category,
        lastModified: st.mtimeMs
      })
    }
  }
  // largest first
  out.sort((a, b) => b.size - a.size)
  return out
}

async function scanAllCategories(): Promise<CleanupItem[]> {
  const categories = [
    scanCache,
    scanLogs,
    scanTemporary,
    scanOldDownloads,
    scanBrowserCache,
    scanAppSupport
  ]
  const collected: CleanupItem[] = []
  for (let i = 0; i < categories.length; i++) {
    const res = await categories[i]()
    collected.push(...res)
    if (mainWindow) mainWindow.webContents.send('scan-progress', (i + 1) / categories.length)
  }
  return collected
}

// ---------- IPC ----------

ipcMain.handle('scan-all', async () => {
  return await scanAllCategories()
})

ipcMain.handle('delete-items', async (_evt, paths: string[]) => {
  let deleted = 0
  let failed = 0
  // Use trash for safety. For paths that can't be trashed (system-level), optionally use sudo remove.
  for (const p of paths) {
    try {
      // First try trash
      await trash([p])
      deleted++
    } catch (e) {
      // Attempt privileged removal for system locations (last resort)
      try {
        await new Promise<void>((resolve, reject) => {
          const options = { name: 'CleanMyMac Pro (React)' }
          sudo.exec(`rm -rf "${p.replace(/"/g, '\"')}"`, options, (error: any) => {
            if (error) reject(error)
            else resolve()
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