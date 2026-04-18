const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs/promises')
const { v4: uuidv4 } = require('uuid')
const { getDirectorySize, statSafe, olderThan } = require('./fs.cjs')

const SCAN_PROFILES = {
    quick: ['Cache', 'Logs', 'Old Downloads'],
    safe: ['Cache', 'Logs', 'Temporary', 'Old Downloads', 'Browser Cache'],
    complete: ['Cache', 'Logs', 'Temporary', 'Old Downloads', 'Browser Cache', 'App Support']
}

function normalizePath(targetPath) {
    return path.resolve(targetPath)
}

function isPathWithin(root, target) {
    const normalizedRoot = normalizePath(root)
    const normalizedTarget = normalizePath(target)
    const rel = path.relative(normalizedRoot, normalizedTarget)
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

function buildCategoryTargets() {
    const home = os.homedir()
    return {
        'Cache': [path.join(home, 'Library', 'Caches'), '/Library/Caches'],
        'Logs': [path.join(home, 'Library', 'Logs'), '/Library/Logs'],
        'Temporary': ['/tmp', path.join(home, '.Trash')],
        'Old Downloads': [path.join(home, 'Downloads')],
        'Browser Cache': [
            path.join(home, 'Library', 'Caches', 'com.apple.Safari'),
            path.join(home, 'Library', 'Caches', 'Google', 'Chrome'),
            path.join(home, 'Library', 'Caches', 'Firefox')
        ],
        'App Support': [path.join(home, 'Library', 'Application Support')]
    }
}

function resolveTargetsForCategory(category, allowedRoots) {
    const candidates = buildCategoryTargets()[category] || []
    const normalizedAllowedRoots = allowedRoots.map(normalizePath)

    const allowed = []
    const blocked = []

    for (const candidate of candidates) {
        const normalizedCandidate = normalizePath(candidate)
        const hasPermission = normalizedAllowedRoots.some((root) => isPathWithin(root, normalizedCandidate))

        if (hasPermission) {
            allowed.push(normalizedCandidate)
        } else {
            blocked.push({
                category,
                path: normalizedCandidate,
                reason: 'Permissão insuficiente para diretório fora do escopo autorizado.'
            })
        }
    }

    return { allowed, blocked }
}

async function listDirectoryDetailed(dir) {
    try {
        const names = await fs.readdir(dir, { withFileTypes: true })
        return {
            entries: names.map((d) => ({ name: d.name, isDir: d.isDirectory(), full: path.join(dir, d.name) })),
            error: null
        }
    } catch (error) {
        return { entries: [], error }
    }
}

async function scanGroup(dirs, category, opts = {}, onSubProgress = null) {
    const out = []
    const skipped = []
    const totalDirs = dirs.length || 1
    let processedDirs = 0

    for (const dir of dirs) {
        const { entries: items, error } = await listDirectoryDetailed(dir)
        if (error) {
            const reason = error && error.code === 'EACCES'
                ? 'Permissão de leitura negada pelo sistema.'
                : 'Diretório não pôde ser analisado.'
            skipped.push({ category, path: dir, reason })
            processedDirs++
            if (onSubProgress) onSubProgress(processedDirs / totalDirs)
            continue
        }

        const totalItems = items.length || 1
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
    return { items: out, skipped }
}

function buildCategoryOptions(category) {
    if (category === 'Logs') return { extensions: ['log', 'txt'] }
    if (category === 'Old Downloads') {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
        return { olderThanMs: cutoff }
    }
    if (category === 'App Support') return { minSize: 10 * 1024 * 1024 }
    return {}
}

async function scanAllCategories({ onProgress, allowedRoots = [], profile = 'safe' } = {}) {
    const categories = SCAN_PROFILES[profile] || SCAN_PROFILES.safe
    const allItems = []
    const skipped = []

    for (let i = 0; i < categories.length; i++) {
        const category = categories[i]
        const categoryBaseProgress = i / categories.length
        const categoryWeight = 1 / categories.length

        const onSubProgress = onProgress ? (subProgress) => {
            const totalProgress = categoryBaseProgress + (subProgress * categoryWeight)
            onProgress(totalProgress)
        } : null

        const { allowed, blocked } = resolveTargetsForCategory(category, allowedRoots)
        skipped.push(...blocked)

        if (allowed.length > 0) {
            const res = await scanGroup(allowed, category, buildCategoryOptions(category), onSubProgress)
            allItems.push(...res.items)
            skipped.push(...res.skipped)
        }

        if (onProgress) onProgress((i + 1) / categories.length)
    }

    return { items: allItems, skipped }
}

module.exports = {
    SCAN_PROFILES,
    scanAllCategories
}
