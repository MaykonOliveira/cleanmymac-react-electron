import React from 'react'
import { CleanupCategory, CATEGORY_ORDER, CleanupItem } from '../types'
import { formatBytes } from '../utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { HardDrive, CheckCircle, FolderOpen, MoreVertical } from 'lucide-react'

function SummaryRow({ icon: Icon, label, value, color }: { 
  icon: React.ElementType, 
  label: string, 
  value: string, 
  color?: string 
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${color ? 'text-green-600' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}

function CategoryDropdown({ 
  category, 
  selectAll, 
  deselectAll 
}: { 
  category: CleanupCategory, 
  selectAll: (category: CleanupCategory) => void, 
  deselectAll: (category: CleanupCategory) => void 
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
        title="Opções da categoria"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-6 z-20 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 w-44">
            <button
              onClick={() => {
                selectAll(category)
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              Selecionar todos
            </button>
            <button
              onClick={() => {
                deselectAll(category)
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              Limpar seleção
            </button>
          </div>
        </>
      )}
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
    <aside className="w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 overflow-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Resumo do Sistema</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Espaço Total</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatBytes(totalSize)}</span>
          </div>
          {selectedSize > 0 && (
            <div className="flex items-center justify-between py-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-green-800 dark:text-green-300">Selecionado para Limpeza</span>
              </div>
              <span className="text-sm font-semibold text-green-900 dark:text-green-200">{formatBytes(selectedSize)}</span>
            </div>
          )}
        </div>
      </div>

      {isScanning && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Analisando sistema...</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Categorias</h2>
        <div className="space-y-3">
          {CATEGORY_ORDER.map(cat => {
            const list = grouped[cat]
            if (!list || list.length === 0) return (
              <div key={cat} className="flex items-center space-x-3 py-3 opacity-40">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
                <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{cat}</span>
              </div>
            )
            const size = list.reduce((a, b) => a + b.size, 0)
            const selCount = list.filter(i => selected[i.id]).length
            return (
              <div key={cat} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">{cat}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {list.length} itens • {formatBytes(size)}
                        {selCount > 0 && (
                          <span className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-0.5 rounded-full">
                            {selCount} selecionados
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CategoryDropdown 
                    category={cat}
                    selectAll={selectAll}
                    deselectAll={deselectAll}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}


