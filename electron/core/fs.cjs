const path = require('node:path')
const fs = require('node:fs/promises')

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
                } catch { }
            }
        } catch { }
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

module.exports = { getDirectorySize, listDirectoryOnce, statSafe, olderThan }


