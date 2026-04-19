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

export type RiskLevel = 'low' | 'medium' | 'high'

interface ScanItem {
  id: string
  name: string
  path: string
  size: number
  type: 'file' | 'directory'
  category: CleanupCategory
  lastModified?: number
  safetyScore: number
  riskLevel: RiskLevel
  recommendationReasons: string[]
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

const CATEGORY_BASE_SCORE: Record<CleanupCategory, number> = {
  Cache: 88,
  Logs: 86,
  Temporary: 80,
  'Old Downloads': 58,
  'Browser Cache': 83,
  'App Support': 42
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

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function buildSafetyAssessment(item: {
  category: CleanupCategory
  type: 'file' | 'directory'
  size: number
  lastModified?: number
}): { safetyScore: number; riskLevel: RiskLevel; recommendationReasons: string[] } {
  let score = CATEGORY_BASE_SCORE[item.category] ?? 50
  const reasons: string[] = []

  reasons.push(`Critério auditável: categoria ${item.category} inicia com score base ${score}/100.`)

  if (item.type === 'directory') {
    score -= 10
    reasons.push('Diretório completo detectado: remoção impacta múltiplos arquivos (+risco).')
  } else {
    score += 4
    reasons.push('Arquivo individual detectado: reversão e inspeção são mais simples (-risco).')
  }

  const sizeMb = item.size / (1024 * 1024)
  if (sizeMb > 1024) {
    score -= 20
    reasons.push('Tamanho acima de 1 GB: provável conter dados relevantes (+risco).')
  } else if (sizeMb > 200) {
    score -= 12
    reasons.push('Tamanho entre 200 MB e 1 GB: revisão manual recomendada (+risco moderado).')
  } else if (sizeMb < 50) {
    score += 6
    reasons.push('Item pequeno (<50 MB): impacto potencial reduzido (-risco).')
  }

  if (item.lastModified) {
    const ageMs = Date.now() - item.lastModified
    const ageDays = ageMs / (24 * 60 * 60 * 1000)

    if (ageDays >= 180) {
      score += 16
      reasons.push('Sem modificação há 180+ dias: forte sinal de obsolescência (-risco).')
    } else if (ageDays >= 60) {
      score += 9
      reasons.push('Sem modificação há 60+ dias: provável baixa utilidade atual (-risco).')
    } else if (ageDays <= 7) {
      score -= 16
      reasons.push('Modificado nos últimos 7 dias: potencialmente em uso ativo (+risco).')
    }
  } else {
    reasons.push('Sem metadado de modificação: score mantém peso conservador.')
  }

  const clamped = clampScore(score)
  let riskLevel: RiskLevel = 'medium'

  if (clamped >= 75) riskLevel = 'low'
  else if (clamped < 45) riskLevel = 'high'

  reasons.push(`Score final ${clamped}/100 com nível de risco ${riskLevel.toUpperCase()}.`)

  return {
    safetyScore: clamped,
    riskLevel,
    recommendationReasons: reasons
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

        const assessment = buildSafetyAssessment({
          category,
          type: entry.isDir ? 'directory' : 'file',
          size,
          lastModified: st.mtimeMs
        })

        out.push({
          id: uuidv4(),
          name: entry.name,
          path: entry.full,
          size,
          type: entry.isDir ? 'directory' : 'file',
          category,
          lastModified: st.mtimeMs,
          safetyScore: assessment.safetyScore,
          riskLevel: assessment.riskLevel,
          recommendationReasons: assessment.recommendationReasons
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

  out.sort((a, b) => b.safetyScore - a.safetyScore || b.size - a.size)
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
