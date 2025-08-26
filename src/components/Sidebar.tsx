import React from 'react'
import { CleanupCategory, CATEGORY_ORDER, CleanupItem } from '../types'
import { formatBytes } from '../utils/format'

function Row({ icon, label, value, color }: { icon: string, label: string, value: string, color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ flex: 1 }}>{label}</div>
      <div style={{ fontWeight: 600, color }}>{value}</div>
    </div>
  )
}

export function Sidebar({
  items,
  grouped,
  selected,
  isScanning,
  progress,
  selectAll,
  deselectAll
}: {
  items: CleanupItem[],
  grouped: Record<CleanupCategory, CleanupItem[]>,
  selected: Record<string, boolean>,
  isScanning: boolean,
  progress: number,
  selectAll: (category: CleanupCategory) => void,
  deselectAll: (category: CleanupCategory) => void
}) {
  const totalSize = items.reduce((acc, it) => acc + it.size, 0)
  const selectedSize = items.filter(i => selected[i.id]).reduce((a, b) => a + b.size, 0)

  return (
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
  )
}


