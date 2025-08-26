import React from 'react'
import { CleanupItem } from '../types'
import { formatBytes } from '../utils/format'

export function ItemRow({ item, selected, toggle }: { item: CleanupItem, selected: boolean, toggle: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', alignItems: 'center', gap: 12, padding: 8, border: '1px solid #eee', borderRadius: 8 }}>
      <input type="checkbox" checked={selected} onChange={() => toggle(item.id)} />
      <div>{item.type === 'directory' ? '📁' : '📄'}</div>
      <div>
        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
        <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.path}</div>
        {item.lastModified && <div style={{ fontSize: 11, color: '#999' }}>Modificado: {new Date(item.lastModified).toLocaleDateString()}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600 }}>{formatBytes(item.size)}</div>
        <div style={{ fontSize: 11, color: '#666' }}>{item.type === 'directory' ? 'Pasta' : 'Arquivo'}</div>
      </div>
    </div>
  )
}


