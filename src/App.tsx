import React, { useEffect, useMemo, useState } from 'react'
import {
  CleanupCategory,
  CleanupInsights,
  CleanupItem,
  CATEGORY_ORDER,
  CleanupPreset,
  ReminderFrequency,
  ScanProfile,
  SkippedScanTarget,
  TrayAction,
  AutomationSettings,
  AutomationRule,
  AutomationRunLog
} from './types'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { CategorySection } from './components/CategorySection'
import { ScanScopeSelector } from './components/ScanScopeSelector'
import { CleanupInsightsPanel } from './components/CleanupInsightsPanel'
import { AutomationCenter } from './components/AutomationCenter'
import { AlertDialog } from './components/ui/alert-dialog'
import { useToast } from './components/ui/toast'
import { formatBytes } from './utils/format'
import { Search, Loader2, FolderOpen, ShieldAlert, Settings2, Files, Zap } from 'lucide-react'
import { CATEGORY_INFO } from './types'

const CLEANUP_PRESETS: Array<{ id: CleanupPreset; label: string; description: string }> = [
  {
    id: 'conservative',
    label: 'Conservador',
    description: 'Seleciona apenas risco baixo (score >= 75).'
  },
  {
    id: 'balanced',
    label: 'Balanceado',
    description: 'Seleciona risco baixo e médio seguro (score >= 55).'
  },
  {
    id: 'aggressive',
    label: 'Agressivo',
    description: 'Seleciona tudo, exceto risco alto com score < 25.'
  }
]

function shouldSelectByPreset(item: CleanupItem, preset: CleanupPreset): boolean {
  if (preset === 'conservative') return item.riskLevel === 'low' && item.safetyScore >= 75
  if (preset === 'balanced') return item.riskLevel !== 'high' && item.safetyScore >= 55
  return !(item.riskLevel === 'high' && item.safetyScore < 25)
}

const DEFAULT_AUTOMATION: AutomationSettings = { rules: [], logs: [] }

export default function App() {
  const { addToast } = useToast()
  const [items, setItems] = useState<CleanupItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [isScanning, setIsScanning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeCategory, setActiveCategory] = useState<CleanupCategory | null>(null)
  const [scanProfile, setScanProfile] = useState<ScanProfile>('safe')
  const [authorizedDirectories, setAuthorizedDirectories] = useState<string[]>([])
  const [skippedTargets, setSkippedTargets] = useState<SkippedScanTarget[]>([])
  const [activePreset, setActivePreset] = useState<CleanupPreset | null>(null)
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>('off')
  const [metricsEnabled, setMetricsEnabled] = useState(false)
  const [cleanupInsights, setCleanupInsights] = useState<CleanupInsights | null>(null)
  const [activeTab, setActiveTab] = useState<'config' | 'files' | 'automation'>('config')
  const [automation, setAutomation] = useState<AutomationSettings>(DEFAULT_AUTOMATION)

  useEffect(() => {
    if (!window.cleaner) return
    const off = window.cleaner.onScanProgress((p) => setProgress(p))
    return () => off && off()
  }, [])

  useEffect(() => {
    if (!window.cleaner) return
    const off = window.cleaner.onReminder((payload) => {
      const dueDate = new Date(payload.dueAt).toLocaleDateString('pt-BR')
      addToast({
        message: `Lembrete: sua análise ${payload.frequency === 'weekly' ? 'semanal' : 'mensal'} está pendente desde ${dueDate}.`,
        variant: 'info',
        duration: 8000,
      })
    })
    return () => off && off()
  }, [])

  useEffect(() => {
    if (!window.cleaner) return
    const off = window.cleaner.onAutomationRun((log) => {
      const runLog = log as unknown as AutomationRunLog
      if (runLog.mode === 'suggest' && runLog.itemsFound > 0) {
        addToast({
          message: `Automação "${runLog.ruleName}": ${runLog.itemsFound} itens prontos para limpeza.`,
          variant: 'info',
          duration: 8000,
        })
      } else if (runLog.mode === 'auto' && runLog.itemsDeleted > 0) {
        addToast({
          message: `Automação "${runLog.ruleName}": ${runLog.itemsDeleted} itens removidos (${formatBytes(runLog.bytesDeleted)}).`,
          variant: 'success',
        })
      }
      setAutomation((prev) => ({
        ...prev,
        logs: [runLog, ...prev.logs].slice(0, 100),
        rules: prev.rules.map((r) =>
          r.id === runLog.ruleId ? { ...r, lastRunAt: runLog.at } : r
        )
      }))
    })
    return () => off && off()
  }, [])

  useEffect(() => {
    if (!window.cleaner) return

    const applyTrayAction = async (action: TrayAction) => {
      if (action === 'scan-quick') {
        await handleProfileChange('quick')
        await handleScan()
        return
      }

      if (action === 'scan-safe') {
        await handleProfileChange('safe')
        await handleScan()
        return
      }

      if (action === 'scan-complete') {
        await handleProfileChange('complete')
        await handleScan()
        return
      }

      if (action === 'reminder-weekly') {
        await handleReminderChange('weekly')
        return
      }

      if (action === 'reminder-monthly') {
        await handleReminderChange('monthly')
        return
      }

      document.documentElement.classList.toggle('dark')
    }

    const off = window.cleaner.onTrayAction((action) => {
      void applyTrayAction(action)
    })

    return () => off && off()
  }, [])

  useEffect(() => {
    async function loadSettings() {
      if (!window.cleaner) return
      try {
        const settings = await window.cleaner.getScanSettings()
        setScanProfile(settings.scanProfile)
        setAuthorizedDirectories(settings.authorizedDirectories)
        setReminderFrequency(settings.reminder.frequency)
        setMetricsEnabled(settings.metrics.enabled)
        const insights = await window.cleaner.getCleanupInsights()
        setCleanupInsights(insights)
        const auto = await window.cleaner.getAutomation()
        setAutomation(auto)
      } catch {
        // falls back to useState defaults silently
      }
    }

    void loadSettings()
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

  useEffect(() => {
    if (!window.cleaner || !metricsEnabled) return
    void window.cleaner.trackMetricEvent('selection_changed', { selectedCount: selectedList.length })
  }, [selectedList.length, metricsEnabled])

  async function handleScan() {
    if (!window.cleaner) return
    setIsScanning(true)
    setActiveTab('files')
    setItems([])
    setSelected({})
    setProgress(0)
    setSkippedTargets([])
    setActivePreset(null)
    try {
      const result = await window.cleaner.scanAll()
      setItems(result.items)
      setSkippedTargets(result.skipped)
      setProgress(1)
    } catch {
      addToast({ message: 'Falha ao analisar o sistema. Tente novamente.', variant: 'error' })
    } finally {
      setIsScanning(false)
    }
  }

  async function handleProfileChange(profile: ScanProfile) {
    if (!window.cleaner) return
    const settings = await window.cleaner.setScanProfile(profile)
    setScanProfile(settings.scanProfile)
    setAuthorizedDirectories(settings.authorizedDirectories)
  }

  async function handleReminderChange(frequency: ReminderFrequency) {
    if (!window.cleaner) return
    const settings = await window.cleaner.setReminderFrequency(frequency)
    setReminderFrequency(settings.reminder.frequency)
  }

  async function handleMetricsOptIn(enabled: boolean) {
    if (!window.cleaner) return
    const settings = await window.cleaner.setMetricsOptIn(enabled)
    setMetricsEnabled(settings.metrics.enabled)
    const insights = await window.cleaner.getCleanupInsights()
    setCleanupInsights(insights)
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

  function applyCleanupPreset(preset: CleanupPreset) {
    const next: Record<string, boolean> = {}
    for (const item of items) {
      if (shouldSelectByPreset(item, preset)) {
        next[item.id] = true
      }
    }
    setSelected(next)
    setActivePreset(preset)
  }

  function handleDelete() {
    if (!window.cleaner) return
    if (selectedList.length === 0) return
    setConfirmOpen(true)
  }

  async function handleDeleteConfirmed() {
    if (!window.cleaner) return
    setIsDeleting(true)
    try {
      if (metricsEnabled) {
        await window.cleaner.trackMetricEvent('clean_triggered', {
          selectedCount: selectedList.length,
          selectedSize
        })
      }

      const { deleted, failed } = await window.cleaner.deleteItems(selectedList.map(i => i.path))
      const failedPaths = new Set(failed.map((entry) => entry.path))
      const deletedItems = selectedList.filter((item) => !failedPaths.has(item.path))
      const deletedBytes = deletedItems.reduce((acc, item) => acc + item.size, 0)
      const deletedByCategory = deletedItems.reduce<Partial<Record<CleanupCategory, number>>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + item.size
        return acc
      }, {})

      if (metricsEnabled) {
        await window.cleaner.trackMetricEvent('clean_completed', {
          deletedCount: deleted,
          failedCount: failed.length,
          deletedBytes,
          deletedByCategory
        })
      }

      const insights = await window.cleaner.getCleanupInsights()
      setCleanupInsights(insights)

      if (failed.length > 0) {
        addToast({
          message: `Limpeza parcial: ${deleted} ${deleted === 1 ? 'item removido' : 'itens removidos'}, ${failed.length} bloqueado${failed.length > 1 ? 's' : ''} pelo sistema.`,
          variant: 'error',
          duration: 7000,
        })
      } else {
        addToast({
          message: `Limpeza concluída. ${deleted} ${deleted === 1 ? 'item removido' : 'itens removidos'} com sucesso.`,
          variant: 'success',
        })
      }

      const kept = items.filter(i => !selected[i.id])
      setItems(kept)
      setSelected({})
      setActivePreset(null)
    } catch {
      addToast({ message: 'Erro inesperado durante a limpeza. Tente novamente.', variant: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  // RF-03: Automation handlers

  async function handleCreateRule(rule: Omit<AutomationRule, 'id' | 'createdAt'>) {
    if (!window.cleaner) return
    const updated = await window.cleaner.createAutomationRule(rule as Record<string, unknown>)
    setAutomation(updated)
  }

  async function handleUpdateRule(id: string, patch: Partial<Omit<AutomationRule, 'id' | 'createdAt'>>) {
    if (!window.cleaner) return
    const updated = await window.cleaner.updateAutomationRule(id, patch as Record<string, unknown>)
    setAutomation(updated)
  }

  async function handleDeleteRule(id: string) {
    if (!window.cleaner) return
    const updated = await window.cleaner.deleteAutomationRule(id)
    setAutomation(updated)
  }

  async function handleToggleRule(id: string, enabled: boolean) {
    if (!window.cleaner) return
    const updated = await window.cleaner.toggleAutomationRule(id, enabled)
    setAutomation(updated)
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
    setActivePreset(null)
  }

  function deselectAll(category: CleanupCategory) {
    const citems = grouped[category]
    setSelected(prev => {
      const next = { ...prev }
      for (const it of citems) delete next[it.id]
      return next
    })
    setActivePreset(null)
  }

  // suppress unused variable warning
  void totalSize

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
          onCategorySelect={(cat) => { setActiveCategory(cat); if (cat !== null) setActiveTab('files') }}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <Header
          isScanning={isScanning}
          isDeleting={isDeleting}
          onScan={handleScan}
          canClean={selectedList.length > 0}
          onClean={handleDelete}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <AlertDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirmar Limpeza"
          description={`Tem certeza que deseja remover ${selectedList.length} ${selectedList.length === 1 ? 'item' : 'itens'}? Esta ação não pode ser desfeita.\n\nEspaço a ser liberado: ${formatBytes(selectedSize)}`}
          confirmLabel="Remover Arquivos"
          cancelLabel="Cancelar"
          onConfirm={handleDeleteConfirmed}
          variant="destructive"
        />

        <section className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
          {/* Tab bar */}
          <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8">
            <div className="flex">
              <button
                onClick={() => setActiveTab('config')}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'config'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                Geral
              </button>
              <button
                onClick={() => setActiveTab('automation')}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'automation'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Zap className="w-4 h-4" />
                Automação
                {automation.rules.filter((r) => r.enabled).length > 0 && (
                  <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                    {automation.rules.filter((r) => r.enabled).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'files'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Files className="w-4 h-4" />
                {activeCategory ? CATEGORY_INFO[activeCategory].label : 'Arquivos'}
                {activeCategory && grouped[activeCategory].length > 0 && (
                  <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                    {grouped[activeCategory].length}
                  </span>
                )}
                {isScanning && (
                  <Loader2 className="w-3 h-3 animate-spin ml-1 text-blue-500" />
                )}
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'config' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <ScanScopeSelector
                  profile={scanProfile}
                  directories={authorizedDirectories}
                  reminderFrequency={reminderFrequency}
                  metricsEnabled={metricsEnabled}
                  onProfileChange={handleProfileChange}
                  onAddDirectory={handleAddDirectory}
                  onRemoveDirectory={handleRemoveDirectory}
                  onReminderFrequencyChange={handleReminderChange}
                  onMetricsOptInChange={handleMetricsOptIn}
                  disabled={isScanning}
                />
                <CleanupInsightsPanel insights={cleanupInsights} />
                {skippedTargets.length > 0 && !isScanning && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
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
              </div>
            )}

            {activeTab === 'automation' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <AutomationCenter
                  automation={automation}
                  onCreateRule={handleCreateRule}
                  onUpdateRule={handleUpdateRule}
                  onDeleteRule={handleDeleteRule}
                  onToggleRule={handleToggleRule}
                />
              </div>
            )}

            {activeTab === 'files' && (
              <div className="p-4 sm:p-6 lg:p-8">
                {isScanning ? (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                    <div className="space-y-3 max-w-lg">
                      <h2 className="text-2xl font-light text-gray-800 dark:text-gray-200">Analisando sistema...</h2>
                      <p className="text-gray-500 dark:text-gray-400">
                        Procurando por arquivos desnecessários que podem ser removidos com segurança
                      </p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-400 dark:text-gray-500">{Math.round(progress * 100)}% concluído</p>
                    </div>
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Search className="w-10 h-10 text-white" />
                    </div>
                    <div className="space-y-3 max-w-lg">
                      <h2 className="text-2xl font-light text-gray-800 dark:text-gray-200">Sistema pronto para análise</h2>
                      <p className="text-gray-500 dark:text-gray-400">
                        Clique em <span className="font-semibold text-blue-600 dark:text-blue-400">Analisar Sistema</span> para encontrar arquivos desnecessários
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-6xl mx-auto space-y-4">
                    {items.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-300 mb-2">Presets de seleção rápida</div>
                        <div className="flex flex-wrap gap-2">
                          {CLEANUP_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => applyCleanupPreset(preset.id)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${activePreset === preset.id
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                              title={preset.description}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        {activePreset && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                            {CLEANUP_PRESETS.find((p) => p.id === activePreset)?.description}
                          </p>
                        )}
                      </div>
                    )}
                    {activeCategory ? (
                      <CategorySection
                        category={activeCategory}
                        items={grouped[activeCategory]}
                        selected={selected}
                        toggle={toggle}
                        selectAll={selectAll}
                        deselectAll={deselectAll}
                        hasBeenScanned={progress > 0 && !isScanning}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 px-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl">
                          <FolderOpen className="w-10 h-10 text-white" />
                        </div>
                        <div className="space-y-3 max-w-md">
                          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Selecione uma categoria</h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            {sidebarOpen
                              ? 'Clique em uma categoria na sidebar para visualizar os arquivos encontrados'
                              : 'Abra a sidebar para selecionar uma categoria'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
