const path = require('node:path')
const os = require('node:os')
const { v4: uuidv4 } = require('uuid')
const { getDirectorySize, listDirectoryOnce, statSafe, olderThan } = require('./fs.cjs')

async function scanGroup(dirs, category, opts = {}, onSubProgress = null) {
    const out = []
    let totalDirs = dirs.length
    let processedDirs = 0
    
    for (const dir of dirs) {
        const items = await listDirectoryOnce(dir)
        let totalItems = items.length
        let processedItems = 0
        
        for (const entry of items) {
            const st = await statSafe(entry.full)
            if (!st) {
                processedItems++
                if (onSubProgress) {
                    const dirProgress = processedItems / totalItems
                    const overallProgress = (processedDirs + dirProgress) / totalDirs
                    onSubProgress(overallProgress)
                }
                continue
            }

            if (opts.extensions && !entry.isDir) {
                const ext = path.extname(entry.name).toLowerCase().replace('.', '')
                if (!opts.extensions.includes(ext)) {
                    processedItems++
                    if (onSubProgress) {
                        const dirProgress = processedItems / totalItems
                        const overallProgress = (processedDirs + dirProgress) / totalDirs
                        onSubProgress(overallProgress)
                    }
                    continue
                }
            }

            if (opts.olderThanMs && st.mtimeMs && !olderThan(st.mtimeMs, opts.olderThanMs)) {
                processedItems++
                if (onSubProgress) {
                    const dirProgress = processedItems / totalItems
                    const overallProgress = (processedDirs + dirProgress) / totalDirs
                    onSubProgress(overallProgress)
                }
                continue
            }

            let size = st.size
            if (entry.isDir) size = await getDirectorySize(entry.full)
            if (opts.minSize && size < opts.minSize) {
                processedItems++
                if (onSubProgress) {
                    const dirProgress = processedItems / totalItems
                    const overallProgress = (processedDirs + dirProgress) / totalDirs
                    onSubProgress(overallProgress)
                }
                continue
            }

            out.push({
                id: uuidv4(),
                name: entry.name,
                path: entry.full,
                size,
                type: entry.isDir ? 'directory' : 'file',
                category,
                lastModified: st.mtimeMs
            })
            
            processedItems++
            if (onSubProgress) {
                const dirProgress = processedItems / totalItems
                const overallProgress = (processedDirs + dirProgress) / totalDirs
                onSubProgress(overallProgress)
            }
        }
        processedDirs++
    }
    out.sort((a, b) => b.size - a.size)
    return out
}

async function scanCache(onSubProgress = null) {
    const home = os.homedir()
    const targets = [path.join(home, 'Library', 'Caches'), '/Library/Caches']
    return scanGroup(targets, 'Cache', {}, onSubProgress)
}

async function scanLogs(onSubProgress = null) {
    const home = os.homedir()
    const targets = [path.join(home, 'Library', 'Logs'), '/Library/Logs']
    return scanGroup(targets, 'Logs', { extensions: ['log', 'txt'] }, onSubProgress)
}

async function scanTemporary(onSubProgress = null) {
    const home = os.homedir()
    const targets = ['/tmp', path.join(home, '.Trash')]
    return scanGroup(targets, 'Temporary', {}, onSubProgress)
}

async function scanOldDownloads(onSubProgress = null) {
    const home = os.homedir()
    const downloads = path.join(home, 'Downloads')
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return scanGroup([downloads], 'Old Downloads', { olderThanMs: cutoff }, onSubProgress)
}

async function scanBrowserCache(onSubProgress = null) {
    const home = os.homedir()
    const targets = [
        path.join(home, 'Library', 'Caches', 'com.apple.Safari'),
        path.join(home, 'Library', 'Caches', 'Google', 'Chrome'),
        path.join(home, 'Library', 'Caches', 'Firefox')
    ]
    return scanGroup(targets, 'Browser Cache', {}, onSubProgress)
}

async function scanAppSupport(onSubProgress = null) {
    const home = os.homedir()
    const targets = [path.join(home, 'Library', 'Application Support')]
    return scanGroup(targets, 'App Support', { minSize: 10 * 1024 * 1024 }, onSubProgress)
}

async function scanAllCategories(onProgress) {
    const cats = [scanCache, scanLogs, scanTemporary, scanOldDownloads, scanBrowserCache, scanAppSupport]
    const out = []
    for (let i = 0; i < cats.length; i++) {
        const categoryBaseProgress = i / cats.length
        const categoryWeight = 1 / cats.length
        
        const onSubProgress = onProgress ? (subProgress) => {
            const totalProgress = categoryBaseProgress + (subProgress * categoryWeight)
            onProgress(totalProgress)
        } : null
        
        const res = await cats[i](onSubProgress)
        out.push(...res)
        
        // Ensure we reach the full category progress
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


