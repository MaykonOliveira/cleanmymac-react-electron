import React, { useEffect, useMemo, useState } from 'react'
import { CleanupCategory, CleanupItem, CATEGORY_ORDER } from './types'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { CategorySection } from './components/CategorySection'
import { formatBytes } from './utils/format'

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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100vh', fontFamily: 'ui-sans-serif, system-ui' }}>
      <Sidebar
        items={items}
        grouped={grouped}
        selected={selected}
        isScanning={isScanning}
        progress={progress}
        selectAll={selectAll}
        deselectAll={deselectAll}
      />

      <main style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header isScanning={isScanning} onScan={handleScan} canClean={selectedSize > 0} onClean={handleDelete} />
        <section style={{ padding: 16, overflow: 'auto' }}>
          {items.length === 0 && !isScanning ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
              <div style={{ fontSize: 48 }}>🖥️</div>
              <div style={{ fontSize: 18 }}>Clique em <b>Analisar</b> para encontrar arquivos que podem ser removidos</div>
            </div>
          ) : (
            CATEGORY_ORDER.map(cat => (
              <CategorySection key={cat} category={cat} items={grouped[cat]} selected={selected} toggle={toggle} />
            ))
          )}
        </section>
      </main>
    </div>
  )
}

