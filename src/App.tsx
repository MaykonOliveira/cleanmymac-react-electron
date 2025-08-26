import React, { useEffect, useMemo, useState } from 'react'
import { CleanupCategory, CleanupItem, CATEGORY_ORDER } from './types'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { CategorySection } from './components/CategorySection'
import { formatBytes } from './utils/format'
import { Search, Loader2, HardDrive, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function App() {
  const [items, setItems] = useState<CleanupItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-96' : 'w-0'} overflow-hidden`}>
        <Sidebar
          items={items}
          grouped={grouped}
          selected={selected}
          isScanning={isScanning}
          progress={progress}
          selectAll={selectAll}
          deselectAll={deselectAll}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <Header 
          isScanning={isScanning} 
          onScan={handleScan} 
          canClean={selectedSize > 0} 
          onClean={handleDelete}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <section className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900">
          {isScanning ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
              <div className="space-y-3 max-w-lg">
                <h2 className="text-3xl font-light text-gray-800 dark:text-gray-200">Analisando sistema...</h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed">
                  Procurando por arquivos desnecessários que podem ser removidos com segurança
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  {Math.round(progress * 100)}% concluído
                </p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Search className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-3 max-w-lg">
                <h2 className="text-3xl font-light text-gray-800 dark:text-gray-200">Sistema pronto para análise</h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed">
                  Clique em <span className="font-semibold text-blue-600 dark:text-blue-400">Analisar Sistema</span> para encontrar arquivos desnecessários que podem ser removidos com segurança
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <HardDrive className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      <span>Espaço Total</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatBytes(totalSize)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {items.length} itens encontrados
                    </div>
                  </CardContent>
                </Card>

                {selectedSize > 0 && (
                  <Card className="border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-green-800 dark:text-green-200 flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span>Selecionados</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {formatBytes(selectedSize)}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {selectedList.length} itens selecionados
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {CATEGORY_ORDER.map(cat => (
                <CategorySection 
                  key={cat} 
                  category={cat} 
                  items={grouped[cat]} 
                  selected={selected} 
                  toggle={toggle} 
                  selectAll={selectAll}
                  deselectAll={deselectAll}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

