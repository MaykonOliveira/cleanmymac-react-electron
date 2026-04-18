import path from 'node:path'
import fs from 'node:fs/promises'

export async function getDirectorySize(targetPath: string): Promise<number> {
  let total = 0

  async function walk(currentPath: string) {
    try {
      const dir = await fs.opendir(currentPath)
      for await (const dirent of dir) {
        const child = path.join(currentPath, dirent.name)
        try {
          const stat = await fs.lstat(child)
          if (stat.isDirectory()) {
            await walk(child)
          } else {
            total += stat.size
          }
        } catch {
          // ignore per-file errors
        }
      }
    } catch {
      // ignore inaccessible directories
    }
  }

  await walk(targetPath)
  return total
}

export async function statSafe(targetPath: string) {
  try {
    return await fs.lstat(targetPath)
  } catch {
    return null
  }
}

export function olderThan(statMtimeMs: number | undefined, cutoff: number): boolean {
  if (!statMtimeMs) return false
  return statMtimeMs < cutoff
}
