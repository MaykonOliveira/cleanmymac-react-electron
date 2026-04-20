import path from 'node:path'
import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

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

export interface DiskSpaceInfo {
  totalBytes: number
  freeBytes: number
  usedBytes: number
}

export function getDiskSpace(): DiskSpaceInfo {
  try {
    // macOS: df -k reports 1K-blocks — columns: Filesystem 1K-blocks Used Available Capacity Mounted
    const output = execFileSync('df', ['-k', '/'], { encoding: 'utf8', timeout: 3000 })
    const parts = output.trim().split('\n')[1].trim().split(/\s+/)
    const BLOCK = 1024
    const totalBytes = parseInt(parts[1], 10) * BLOCK
    const usedBytes = parseInt(parts[2], 10) * BLOCK
    const freeBytes = parseInt(parts[3], 10) * BLOCK
    return { totalBytes, freeBytes, usedBytes }
  } catch {
    return { totalBytes: 0, freeBytes: 0, usedBytes: 0 }
  }
}
