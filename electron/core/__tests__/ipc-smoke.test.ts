import test from 'node:test'
import assert from 'node:assert/strict'
import { createIpcHandlers, type ScanSettings } from '../ipc-handlers.js'

function buildSettings(): ScanSettings {
  return {
    authorizedDirectories: ['/Users/dev'],
    scanProfile: 'safe',
    reminder: {
      frequency: 'off'
    },
    metrics: {
      enabled: false,
      totals: {
        scansStarted: 0,
        scansCompleted: 0,
        cleanActions: 0,
        itemsSelected: 0,
        itemsDeleted: 0
      },
      timeline: {}
    }
  }
}

test('IPC smoke: scan-all envia progresso e retorna itens', async () => {
  const progressEvents: number[] = []
  const settings = buildSettings()

  const handlers = createIpcHandlers({
    getHomePath: () => '/Users/dev',
    getWindow: () => ({
      webContents: {
        send: (_channel, payload) => {
          if (typeof payload === 'number') {
            progressEvents.push(payload)
          }
        }
      }
    }),
    loadScanSettings: async () => settings,
    saveScanSettings: async (next) => next,
    addAuthorizedDirectory: async () => settings,
    runScanAllCategories: async ({ onProgress } = {}) => {
      onProgress?.(0.5)
      return {
        items: [
          {
            id: '1',
            name: 'file',
            path: '/tmp/file',
            size: 42,
            type: 'file',
            category: 'Cache',
            safetyScore: 90,
            riskLevel: 'low',
            recommendationReasons: ['test']
          }
        ],
        skipped: []
      }
    },
    trashItem: async () => undefined,
    onSettingsUpdated: () => undefined
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
    loadScanSettings: async () => buildSettings(),
    saveScanSettings: async (next) => next,
    addAuthorizedDirectory: async () => null,
    trashItem: async (targetPath) => {
      trashCalls.push(targetPath)
      if (targetPath.includes('locked')) {
        throw new Error('blocked')
      }
    },
    onSettingsUpdated: () => undefined
  })

  const result = await handlers.deleteItems(null, ['/tmp/a', '/tmp/locked', 123])

  assert.deepEqual(trashCalls, ['/tmp/a', '/tmp/locked'])
  assert.equal(result.deleted, 1)
  assert.equal(result.failed.length, 1)
  assert.equal(result.failed[0]?.path, '/tmp/locked')
})
