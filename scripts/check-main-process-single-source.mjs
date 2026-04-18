import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const ELECTRON_DIR = path.join(ROOT, 'electron')
const LEGACY_EXTENSIONS = new Set(['.cjs', '.js'])

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full)))
    } else {
      files.push(full)
    }
  }

  return files
}

function relative(filePath) {
  return path.relative(ROOT, filePath)
}

async function main() {
  const allFiles = await walk(ELECTRON_DIR)
  const sourceFiles = allFiles.filter((filePath) => ['.ts', '.tsx', '.cjs', '.js'].includes(path.extname(filePath)))

  const legacyFiles = sourceFiles.filter((filePath) => LEGACY_EXTENSIONS.has(path.extname(filePath)))
  if (legacyFiles.length > 0) {
    throw new Error(
      [
        'Found legacy JavaScript/CJS files in electron/ main process source.',
        'Keep a single TypeScript source of truth under electron/**.ts.',
        ...legacyFiles.map((filePath) => ` - ${relative(filePath)}`)
      ].join('\n')
    )
  }

  const hasMainEntrypoint = sourceFiles.some((filePath) => relative(filePath) === 'electron/main.ts')
  if (!hasMainEntrypoint) {
    throw new Error('Missing required entrypoint: electron/main.ts')
  }

  console.log('Main-process source check passed: single TypeScript source of truth detected.')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
