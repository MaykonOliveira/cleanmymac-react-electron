import React from 'react'

export function Header({ isScanning, onScan, canClean, onClean }: { isScanning: boolean, onScan: () => void, canClean: boolean, onClean: () => void }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #ddd' }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>CleanMyMac Pro</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        {isScanning ? <span>⏳</span> : <button onClick={onScan}>Analisar</button>}
        {canClean && <button onClick={onClean} style={{ background: '#1976d2', color: 'white' }}>Limpar</button>}
      </div>
    </header>
  )
}


