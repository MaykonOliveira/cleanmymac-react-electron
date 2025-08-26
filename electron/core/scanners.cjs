const path = require('node:path')
const os = require('node:os')
const { v4: uuidv4 } = require('uuid')
const { getDirectorySize, listDirectoryOnce, statSafe, olderThan } = require('./fs.cjs')

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
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
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
    return scanGroup(targets, 'App Support', { minSize: 10 * 1024 * 1024 })
}

async function scanAllCategories(onProgress) {
    const cats = [scanCache, scanLogs, scanTemporary, scanOldDownloads, scanBrowserCache, scanAppSupport]
    const out = []
    for (let i = 0; i < cats.length; i++) {
        const res = await cats[i]()
        out.push(...res)
        if (onProgress) onProgress((i + 1) / cats.length)
    }
    return out
}

module.exports = {
    scanGroup,
    scanCache,
    scanLogs,
    scanTemporary,
    scanOldDownloads,
    scanBrowserCache,
    scanAppSupport,
    scanAllCategories
}


