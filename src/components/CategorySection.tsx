import React from 'react'
import { CleanupCategory, CleanupItem } from '../types'
import { ItemRow } from './ItemRow'

export function CategorySection({ category, items, selected, toggle }: {
  category: CleanupCategory,
  items: CleanupItem[],
  selected: Record<string, boolean>,
  toggle: (id: string) => void
}) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{category}</div>
        <div style={{ fontSize: 12, color: '#666' }}>{items.length} itens</div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(it => (
          <ItemRow key={it.id} item={it} selected={!!selected[it.id]} toggle={toggle} />
        ))}
      </div>
    </div>
  )
}


