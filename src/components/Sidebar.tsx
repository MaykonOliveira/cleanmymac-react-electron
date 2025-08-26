import React from 'react'
import { CleanupCategory, CATEGORY_ORDER, CleanupItem, CATEGORY_INFO } from '../types'
import { formatBytes } from '../utils/format'
import { FolderOpen, MoreVertical, Info, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'


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
  deselectAll,
  onClose
}: {
  items: CleanupItem[],
  grouped: Record<CleanupCategory, CleanupItem[]>,
  selected: Record<string, boolean>,
  isScanning: boolean,
  progress: number,
  selectAll: (category: CleanupCategory) => void,
  deselectAll: (category: CleanupCategory) => void,
  onClose?: () => void
}) {

  return (
    <TooltipProvider>
      <aside className="w-96 h-full bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 overflow-auto transition-all duration-300 ease-in-out">
      {onClose && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Ocultar sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

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
            const categoryInfo = CATEGORY_INFO[cat]
            if (!list || list.length === 0) return (
              <div key={cat} className="flex items-start space-x-3 py-3 opacity-40">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex items-start space-x-2 min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-400 dark:text-gray-500 leading-5">{categoryInfo.label}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors shrink-0 mt-0.5">
                        <Info className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>{categoryInfo.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )
            const size = list.reduce((a, b) => a + b.size, 0)
            const selCount = list.filter(i => selected[i.id]).length
            return (
              <div key={cat} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0 mt-0.5">
                      <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start space-x-2">
                        <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 leading-5">
                          {categoryInfo.label}
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0 mt-0.5">
                              <Info className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>{categoryInfo.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {list.length} itens • {formatBytes(size)}
                      </div>
                    </div>
                  </div>
                  <CategoryDropdown 
                    category={cat}
                    selectAll={selectAll}
                    deselectAll={deselectAll}
                  />
                </div>
                {selCount > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {selCount} item{selCount > 1 ? 's' : ''} selecionado{selCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      </aside>
    </TooltipProvider>
  )
}


