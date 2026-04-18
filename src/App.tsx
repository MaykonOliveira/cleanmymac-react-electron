import React, { useEffect, useMemo, useState } from 'react'
import { CleanupCategory, CleanupItem, CATEGORY_ORDER, ScanProfile, SkippedScanTarget } from './types'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { CategorySection } from './components/CategorySection'
import { ScanScopeSelector } from './components/ScanScopeSelector'
import { formatBytes } from './utils/format'
import { Search, Loader2, FolderOpen, ShieldAlert } from 'lucide-react'

export default function App() {
  const [items, setItems] = useState<CleanupItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeCategory, setActiveCategory] = useState<CleanupCategory | null>(null)
  const [scanProfile, setScanProfile] = useState<ScanProfile>('safe')
  const [authorizedDirectories, setAuthorizedDirectories] = useState<string[]>([])
  const [skippedTargets, setSkippedTargets] = useState<SkippedScanTarget[]>([])

  useEffect(() => {
    if (!window.cleaner) return
    const off = window.cleaner.onScanProgress((p) => setProgress(p))
    return () => off && off()
  }, [])

  useEffect(() => {
    async function loadSettings() {
      if (!window.cleaner) return
      const settings = await window.cleaner.getScanSettings()
      setScanProfile(settings.scanProfile)
      setAuthorizedDirectories(settings.authorizedDirectories)
    }

    loadSettings()
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
    setSkippedTargets([])
    const result = await window.cleaner.scanAll()
    setItems(result.items)
    setSkippedTargets(result.skipped)
    setIsScanning(false)
    setProgress(1)
  }

  async function handleProfileChange(profile: ScanProfile) {
    if (!window.cleaner) return
    const settings = await window.cleaner.setScanProfile(profile)
    setScanProfile(settings.scanProfile)
    setAuthorizedDirectories(settings.authorizedDirectories)
  }

  async function handleAddDirectory() {
    if (!window.cleaner) return
    const settings = await window.cleaner.addAuthorizedDirectory()
    if (!settings) return
    setScanProfile(settings.scanProfile)
    setAuthorizedDirectories(settings.authorizedDirectories)
  }

  async function handleRemoveDirectory(targetPath: string) {
    if (!window.cleaner) return
    const settings = await window.cleaner.removeAuthorizedDirectory(targetPath)
    setScanProfile(settings.scanProfile)
    setAuthorizedDirectories(settings.authorizedDirectories)
  }

  async function handleDelete() {
    if (!window.cleaner) return
    if (selectedList.length === 0) return
    const ok = confirm(`Tem certeza que deseja deletar ${selectedList.length} itens?\n\nEspaço a ser liberado: ${formatBytes(selectedSize)}`)
    if (!ok) return
    const { deleted, failed } = await window.cleaner.deleteItems(selectedList.map(i => i.path))
    if (failed.length > 0) {
      const details = failed
        .slice(0, 3)
        .map((entry) => `• ${entry.path}\n  Motivo: ${entry.message}`)
        .join('\n\n')
      const extra = failed.length > 3 ? `\n\n...e mais ${failed.length - 3} item(ns) com restrição do sistema.` : ''
      alert(
        `Limpeza parcial concluída.\n\nRemovidos: ${deleted}\nBloqueados pelo sistema: ${failed.length}\n\n` +
        'Alguns arquivos não podem ser removidos sem permissões adicionais ou porque estão protegidos pelo macOS.\n\n' +
        `${details}${extra}`
      )
    } else {
      alert(`Limpeza concluída com sucesso. Removidos: ${deleted}.`)
    }
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 relative">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        transition-all duration-300 ease-in-out overflow-hidden
        lg:relative lg:z-auto
        ${sidebarOpen ? 'fixed inset-y-0 left-0 z-50 w-80 sm:w-96 lg:static lg:w-96' : 'w-0'}
      `}>
        <Sidebar
          items={items}
          grouped={grouped}
          selected={selected}
          isScanning={isScanning}
          progress={progress}
          selectAll={selectAll}
          deselectAll={deselectAll}
          activeCategory={activeCategory}
          onCategorySelect={setActiveCategory}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <Header
          isScanning={isScanning}
          onScan={handleScan}
          canClean={selectedList.length > 0}
          onClean={handleDelete}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <section className="flex-1 flex flex-col h-0 p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <ScanScopeSelector
            profile={scanProfile}
            directories={authorizedDirectories}
            onProfileChange={handleProfileChange}
            onAddDirectory={handleAddDirectory}
            onRemoveDirectory={handleRemoveDirectory}
            disabled={isScanning}
          />

          {skippedTargets.length > 0 && !isScanning && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold text-sm">
                <ShieldAlert className="w-4 h-4" />
                Itens não analisados por permissão insuficiente ({skippedTargets.length})
              </div>
              <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300 max-h-28 overflow-y-auto">
                {skippedTargets.slice(0, 20).map((target) => (
                  <li key={`${target.category}-${target.path}`}>
                    <span className="font-semibold">[{target.category}]</span> {target.path} — {target.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isScanning ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white animate-spin" />
              </div>
              <div className="space-y-3 max-w-lg">
                <h2 className="text-2xl sm:text-3xl font-light text-gray-800 dark:text-gray-200">Analisando sistema...</h2>
                <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg leading-relaxed">
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
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Search className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
              </div>
              <div className="space-y-3 max-w-lg">
                <h2 className="text-2xl sm:text-3xl font-light text-gray-800 dark:text-gray-200">Sistema pronto para análise</h2>
                <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg leading-relaxed">
                  Clique em <span className="font-semibold text-blue-600 dark:text-blue-400">Analisar Sistema</span> para encontrar arquivos desnecessários que podem ser removidos com segurança
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col h-0">
              {activeCategory ? (
                <CategorySection
                  category={activeCategory}
                  items={grouped[activeCategory]}
                  selected={selected}
                  toggle={toggle}
                  selectAll={selectAll}
                  deselectAll={deselectAll}
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl">
                    <FolderOpen className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
                  </div>
                  <div className="space-y-3 max-w-md">
                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">Selecione uma categoria</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg leading-relaxed">
                      {sidebarOpen ? (
                        'Clique em uma categoria na sidebar para visualizar os arquivos encontrados e gerenciar sua limpeza'
                      ) : (
                        'Abra a sidebar para selecionar uma categoria e visualizar os arquivos encontrados'
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
