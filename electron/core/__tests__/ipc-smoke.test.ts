import test from 'node:test'
import assert from 'node:assert/strict'
import { createIpcHandlers, type ScanSettings } from '../ipc-handlers.js'

test('IPC smoke: scan-all envia progresso e retorna itens', async () => {
  const progressEvents: number[] = []
  const settings: ScanSettings = {
    authorizedDirectories: ['/Users/dev'],
    scanProfile: 'safe'
  }

  const handlers = createIpcHandlers({
    getHomePath: () => '/Users/dev',
    getWindow: () => ({
      webContents: {
        send: (_channel, payload) => {
          progressEvents.push(payload)
        }
      }
    }),
    loadScanSettings: async () => settings,
    saveScanSettings: async (next) => next,
    addAuthorizedDirectory: async () => settings,
    runScanAllCategories: async ({ onProgress } = {}) => {
      onProgress?.(0.5)
      return {
        items: [{ id: '1', name: 'file', path: '/tmp/file', size: 42, type: 'file', category: 'Cache' }],
        skipped: []
      }
    },
    trashItem: async () => undefined
  })

  const result = await handlers.scanAll()

  assert.equal(progressEvents.length, 1)
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0]?.path, '/tmp/file')
})

test('IPC smoke: delete-items contabiliza sucesso e falhas', async () => {
  const trashCalls: string[] = []
  const handlers = createIpcHandlers({
    getHomePath: () => '/Users/dev',
    getWindow: () => null,
    loadScanSettings: async () => ({ authorizedDirectories: ['/Users/dev'], scanProfile: 'safe' }),
    saveScanSettings: async (next) => next,
    addAuthorizedDirectory: async () => null,
    trashItem: async (targetPath) => {
      trashCalls.push(targetPath)
      if (targetPath.includes('locked')) {
        throw new Error('blocked')
      }
    }
  })

  const result = await handlers.deleteItems(null, ['/tmp/a', '/tmp/locked', 123])

  assert.deepEqual(trashCalls, ['/tmp/a', '/tmp/locked'])
  assert.equal(result.deleted, 1)
  assert.equal(result.failed.length, 1)
  assert.equal(result.failed[0]?.path, '/tmp/locked')
})
