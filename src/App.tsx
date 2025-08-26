import React, { useEffect, useMemo, useState } from 'react'

// Types matching what preload exposes
export type ItemType = 'file' | 'directory'
export type CleanupCategory = 'Cache' | 'Logs' | 'Temporary' | 'Old Downloads' | 'Browser Cache' | 'App Support'

export interface CleanupItem {
  id: string
  name: string
  path: string
  size: number
  type: ItemType
  category: CleanupCategory
  lastModified?: number
}

declare global {
  interface Window {
    cleaner?: {
      scanAll: () => Promise<CleanupItem[]>
      deleteItems: (paths: string[]) => Promise<{ deleted: number, failed: number }>
      onScanProgress: (cb: (progress: number) => void) => () => void
    }
  }
}

const formatter = new Intl.NumberFormat('pt-BR')

function formatBytes(bytes: number) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const CATEGORY_ORDER: CleanupCategory[] = [
  'Cache', 'Logs', 'Temporary', 'Old Downloads', 'Browser Cache', 'App Support'
]

export default function App() {
  const [items, setItems] = useState<CleanupItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!window.cleaner) return
    const off = window.cleaner.onScanProgress((p) => setProgress(p))
    return () => off && off()
  }, [])

  const totalSize = useMemo(() => items.reduce((acc, it) => acc + it.size, 0), [items])
  const selectedList = useMemo(() => items.filter(i => selected[i.id]), [items, selected])
  const selectedSize = useMemo(() => selectedList.reduce((a, b) => a + b.size, 0), [selectedList])

  const grouped = useMemo(() => {
    const g: Record<CleanupCategory, CleanupItem[]> = {
      'Cache': [], 'Logs': [], 'Temporary': [], 'Old Downloads': [], 'Browser Cache': [], 'App Support': []
    }
    for (const it of items) g[it.category].push(it)
    return g
  }, [items])

  async function handleScan() {
    if (!window.cleaner) return
    setIsScanning(true)
    setItems([])
    setSelected({})
    setProgress(0)
    const result = await window.cleaner.scanAll()
    setItems(result)
    setIsScanning(false)
    setProgress(1)
  }

  async function handleDelete() {
    if (!window.cleaner) return
    if (selectedList.length === 0) return
    const ok = confirm(`Tem certeza que deseja deletar ${selectedList.length} itens?\n\nEspaço a ser liberado: ${formatBytes(selectedSize)}`)
    if (!ok) return
    const { deleted, failed } = await window.cleaner.deleteItems(selectedList.map(i => i.path))
    alert(`Limpeza concluída. Removidos: ${deleted}, falhas: ${failed}.`)
    // Remove from local state
    const kept = items.filter(i => !selected[i.id])
    setItems(kept)
    setSelected({})
  }

  function toggle(id: string) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function selectAll(category: CleanupCategory) {
    const citems = grouped[category]
    setSelected(prev => {
      const next = { ...prev }
      for (const it of citems) next[it.id] = true
      return next
    })
  }

  function deselectAll(category: CleanupCategory) {
    const citems = grouped[category]
    setSelected(prev => {
      const next = { ...prev }
      for (const it of citems) delete next[it.id]
      return next
    })
  }

  function selectAllItems() {
    setSelected(Object.fromEntries(items.map(it => [it.id, true])))
  }

  function clearSelection() {
    setSelected({})
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100vh', fontFamily: 'ui-sans-serif, system-ui' }}>
      <aside style={{ borderRight: '1px solid #ddd', padding: 16, overflow: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Resumo</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <Row icon="💾" label="Espaço Total" value={formatBytes(totalSize)} />
          {selectedSize > 0 && <Row icon="✅" label="Selecionado" value={formatBytes(selectedSize)} color="#2e7d32" />}
        </div>

        {isScanning && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Analisando arquivos...</div>
            <progress value={progress} max={1} style={{ width: '100%' }} />
          </div>
        )}

        <h3 style={{ marginTop: 24 }}>Categorias</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={selectAllItems}>Selecionar tudo</button>
          <button onClick={clearSelection}>Limpar tudo</button>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {CATEGORY_ORDER.map(cat => {
            const list = grouped[cat]
            if (!list || list.length === 0) return (
              <div key={cat} style={{ opacity: 0.6 }}>{cat}</div>
            )
            const size = list.reduce((a, b) => a + b.size, 0)
            const selCount = list.filter(i => selected[i.id]).length
            return (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{cat}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{list.length} itens • {formatBytes(size)}</div>
                  {selCount > 0 && <div style={{ fontSize: 11, color: '#2e7d32' }}>{selCount} selecionados</div>}
                </div>
                <div>
                  <button onClick={() => selectAll(cat)} style={{ marginRight: 4 }}>Selecionar</button>
                  <button onClick={() => deselectAll(cat)}>Limpar</button>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #ddd' }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>CleanMyMac Pro</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {isScanning ? <span>⏳</span> : <button onClick={handleScan}>Analisar</button>}
            {selectedSize > 0 && <button onClick={handleDelete} style={{ background: '#1976d2', color: 'white' }}>Limpar</button>}
          </div>
        </header>
        <section style={{ padding: 16, overflow: 'auto' }}>
          {items.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={selectAllItems}>Selecionar tudo</button>
              <button onClick={clearSelection}>Limpar tudo</button>
            </div>
          )}
          {items.length === 0 && !isScanning ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
              <div style={{ fontSize: 48 }}>🖥️</div>
              <div style={{ fontSize: 18 }}>Clique em <b>Analisar</b> para encontrar arquivos que podem ser removidos</div>
            </div>
          ) : (
            CATEGORY_ORDER.map(cat => {
              const list = grouped[cat]
              if (!list || list.length === 0) return null
              return (
                <div key={cat} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>{cat}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{list.length} itens</div>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {list.map(it => {
                      const isSel = !!selected[it.id]
                      return (
                        <div key={it.id} style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', alignItems: 'center', gap: 12, padding: 8, border: '1px solid #eee', borderRadius: 8 }}>
                          <input type="checkbox" checked={isSel} onChange={() => toggle(it.id)} />
                          <div>{it.type === 'directory' ? '📁' : '📄'}</div>
                          <div>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                            <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.path}</div>
                            {it.lastModified && <div style={{ fontSize: 11, color: '#999' }}>Modificado: {new Date(it.lastModified).toLocaleDateString()}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600 }}>{formatBytes(it.size)}</div>
                            <div style={{ fontSize: 11, color: '#666' }}>{it.type === 'directory' ? 'Pasta' : 'Arquivo'}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}

function Row({ icon, label, value, color }: { icon: string, label: string, value: string, color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ flex: 1 }}>{label}</div>
      <div style={{ fontWeight: 600, color }}>{value}</div>
    </div>
  )
}