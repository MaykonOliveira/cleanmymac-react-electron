// electron/main.cjs
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const os = require('node:os')
const { v4: uuidv4 } = require('uuid')
const sudo = require('sudo-prompt')

const isDev = !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL
let mainWindow = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    // DEV: carrega a raiz do Vite
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // PROD: carrega o index.html empacotado
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
    await mainWindow.loadFile(indexHtml)
    // mainWindow.webContents.openDevTools({ mode: 'detach' }) // debug opcional em prod
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

// ---------- Helpers de FS ----------
async function getDirectorySize(targetPath) {
  let total = 0
  async function walk(p) {
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
        } catch { /* ignora erro por arquivo */ }
      }
    } catch { /* ignora erro de permissão/pasta ausente */ }
  }
  await walk(targetPath)
  return total
}

async function listDirectoryOnce(dir) {
  try {
    const names = await fs.readdir(dir, { withFileTypes: true })
    return names.map(d => ({ name: d.name, isDir: d.isDirectory(), full: path.join(dir, d.name) }))
  } catch {
    return []
  }
}

async function statSafe(p) {
  try { return await fs.lstat(p) } catch { return null }
}

function olderThan(statMtimeMs, cutoff) {
  if (!statMtimeMs) return false
  return statMtimeMs < cutoff
}

// ---------- Scanners ----------
async function scanGroup(dirs, category, opts = {}) {
  const out = []
  for (const dir of dirs) {
    const items = await listDirectoryOnce(dir)
    for (const entry of items) {
      const st = await statSafe(entry.full)
      if (!st) continue

      if (opts.extensions && !entry.isDir) {
        const ext = path.extname(entry.name).toLowerCase().replace('.', '')
        if (!opts.extensions.includes(ext)) continue
      }

      if (opts.olderThanMs && st.mtimeMs && !olderThan(st.mtimeMs, opts.olderThanMs)) {
        continue
      }

      let size = st.size
      if (entry.isDir) size = await getDirectorySize(entry.full)
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
  out.sort((a, b) => b.size - a.size)
  return out
}

async function scanCache() {
  const home = os.homedir()
  const targets = [path.join(home, 'Library', 'Caches'), '/Library/Caches']
  return scanGroup(targets, 'Cache')
}

async function scanLogs() {
  const home = os.homedir()
  const targets = [path.join(home, 'Library', 'Logs'), '/Library/Logs']
  return scanGroup(targets, 'Logs', { extensions: ['log', 'txt'] })
}

async function scanTemporary() {
  const home = os.homedir()
  const targets = ['/tmp', path.join(home, '.Trash')]
  return scanGroup(targets, 'Temporary')
}

async function scanOldDownloads() {
  const home = os.homedir()
  const downloads = path.join(home, 'Downloads')
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 dias
  return scanGroup([downloads], 'Old Downloads', { olderThanMs: cutoff })
}

async function scanBrowserCache() {
  const home = os.homedir()
  const targets = [
    path.join(home, 'Library', 'Caches', 'com.apple.Safari'),
    path.join(home, 'Library', 'Caches', 'Google', 'Chrome'),
    path.join(home, 'Library', 'Caches', 'Firefox')
  ]
  return scanGroup(targets, 'Browser Cache')
}

async function scanAppSupport() {
  const home = os.homedir()
  const targets = [path.join(home, 'Library', 'Application Support')]
  return scanGroup(targets, 'App Support', { minSize: 10 * 1024 * 1024 }) // 10MB+
}

async function scanAllCategories() {
  const cats = [scanCache, scanLogs, scanTemporary, scanOldDownloads, scanBrowserCache, scanAppSupport]
  const out = []
  for (let i = 0; i < cats.length; i++) {
    const res = await cats[i]()
    out.push(...res)
    if (mainWindow) mainWindow.webContents.send('scan-progress', (i + 1) / cats.length)
  }
  return out
}

// ---------- IPC ----------
ipcMain.handle('scan-all', async () => {
  return await scanAllCategories()
})

ipcMain.handle('delete-items', async (_evt, paths) => {
  let deleted = 0, failed = 0
  for (const p of paths) {
    try {
      // vai para a Lixeira (seguro)
      await shell.trashItem(p)
      deleted++
    } catch (e) {
      // último recurso: remoção com privilégio admin
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
