import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { getDirectorySize, statSafe, olderThan } from './fs.js'

export const SCAN_PROFILES = {
  quick: ['Cache', 'Logs', 'Old Downloads'],
  safe: ['Cache', 'Logs', 'Temporary', 'Old Downloads', 'Browser Cache'],
  complete: ['Cache', 'Logs', 'Temporary', 'Old Downloads', 'Browser Cache', 'App Support']
} as const

type ScanProfile = keyof typeof SCAN_PROFILES
export type CleanupCategory = (typeof SCAN_PROFILES)[ScanProfile][number]

interface ScanItem {
  id: string
  name: string
  path: string
  size: number
  type: 'file' | 'directory'
  category: CleanupCategory
  lastModified?: number
}

interface SkippedDirectory {
  category: CleanupCategory
  path: string
  reason: string
}

interface ScanGroupOptions {
  extensions?: string[]
  olderThanMs?: number
  minSize?: number
}

interface ScanAllCategoriesOptions {
  onProgress?: (progress: number) => void
  allowedRoots?: string[]
  profile?: ScanProfile
}

function normalizePath(targetPath: string): string {
  return path.resolve(targetPath)
}

function isPathWithin(root: string, target: string): boolean {
  const normalizedRoot = normalizePath(root)
  const normalizedTarget = normalizePath(target)
  const relative = path.relative(normalizedRoot, normalizedTarget)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function buildCategoryTargets(): Record<CleanupCategory, string[]> {
  const home = os.homedir()
  return {
    Cache: [path.join(home, 'Library', 'Caches'), '/Library/Caches'],
    Logs: [path.join(home, 'Library', 'Logs'), '/Library/Logs'],
    Temporary: ['/tmp', path.join(home, '.Trash')],
    'Old Downloads': [path.join(home, 'Downloads')],
    'Browser Cache': [
      path.join(home, 'Library', 'Caches', 'com.apple.Safari'),
      path.join(home, 'Library', 'Caches', 'Google', 'Chrome'),
      path.join(home, 'Library', 'Caches', 'Firefox')
    ],
    'App Support': [path.join(home, 'Library', 'Application Support')]
  }
}

function resolveTargetsForCategory(category: CleanupCategory, allowedRoots: string[]) {
  const candidates = buildCategoryTargets()[category] ?? []
  const normalizedAllowedRoots = allowedRoots.map(normalizePath)

  const allowed: string[] = []
  const blocked: SkippedDirectory[] = []

  for (const candidate of candidates) {
    const normalizedCandidate = normalizePath(candidate)
    const hasPermission = normalizedAllowedRoots.some((root) => isPathWithin(root, normalizedCandidate))

    if (hasPermission) {
      allowed.push(normalizedCandidate)
      continue
    }

    blocked.push({
      category,
      path: normalizedCandidate,
      reason: 'Permissão insuficiente para diretório fora do escopo autorizado.'
    })
  }

  return { allowed, blocked }
}

async function listDirectoryDetailed(dir: string) {
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

async function scanGroup(
  dirs: string[],
  category: CleanupCategory,
  opts: ScanGroupOptions = {},
  onSubProgress: ((progress: number) => void) | null = null
): Promise<{ items: ScanItem[]; skipped: SkippedDirectory[] }> {
  const out: ScanItem[] = []
  const skipped: SkippedDirectory[] = []
  const totalDirs = dirs.length || 1
  let processedDirs = 0

  for (const dir of dirs) {
    const { entries: items, error } = await listDirectoryDetailed(dir)
    if (error) {
      const reason = typeof error === 'object' && error && 'code' in error && error.code === 'EACCES'
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
      } else {
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
      }

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

function buildCategoryOptions(category: CleanupCategory): ScanGroupOptions {
  if (category === 'Logs') return { extensions: ['log', 'txt'] }
  if (category === 'Old Downloads') {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return { olderThanMs: cutoff }
  }
  if (category === 'App Support') return { minSize: 10 * 1024 * 1024 }
  return {}
}

export async function scanAllCategories({ onProgress, allowedRoots = [], profile = 'safe' }: ScanAllCategoriesOptions = {}) {
  const categories = SCAN_PROFILES[profile] || SCAN_PROFILES.safe
  const allItems: ScanItem[] = []
  const skipped: SkippedDirectory[] = []

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i]
    const categoryBaseProgress = i / categories.length
    const categoryWeight = 1 / categories.length

    const onSubProgress = onProgress
      ? (subProgress: number) => {
          const totalProgress = categoryBaseProgress + subProgress * categoryWeight
          onProgress(totalProgress)
        }
      : null

    const { allowed, blocked } = resolveTargetsForCategory(category, allowedRoots)
    skipped.push(...blocked)

    if (allowed.length > 0) {
      const result = await scanGroup(allowed, category, buildCategoryOptions(category), onSubProgress)
      allItems.push(...result.items)
      skipped.push(...result.skipped)
    }

    if (onProgress) onProgress((i + 1) / categories.length)
  }

  return { items: allItems, skipped }
}
