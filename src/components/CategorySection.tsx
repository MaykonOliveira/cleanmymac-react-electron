import React from 'react'
import { CleanupCategory, CleanupItem, CATEGORY_INFO } from '../types'
import { ItemRow } from './ItemRow'
import { FolderOpen, Info, CheckSquare, Square } from 'lucide-react'
import { formatBytes } from '../utils/format'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

export function CategorySection({ category, items, selected, toggle, selectAll, deselectAll }: {
  category: CleanupCategory,
  items: CleanupItem[],
  selected: Record<string, boolean>,
  toggle: (id: string) => void,
  selectAll?: (category: CleanupCategory) => void,
  deselectAll?: (category: CleanupCategory) => void
}) {
  const categoryInfo = CATEGORY_INFO[category]
  
  if (!items || items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{categoryInfo.label}</h3>
            <p className="text-gray-500 dark:text-gray-400">Nenhum item encontrado nesta categoria</p>
          </div>
        </div>
      </div>
    )
  }
  
  const selectedCount = items.filter(item => selected[item.id]).length
  const totalSize = items.reduce((acc, item) => acc + item.size, 0)
  const selectedSize = items.filter(item => selected[item.id]).reduce((acc, item) => acc + item.size, 0)
  
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header da Categoria */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <FolderOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{categoryInfo.label}</h1>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <Info className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>{categoryInfo.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Total de Itens</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{items.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Tamanho Total</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatBytes(totalSize)}</p>
                  </div>
                  {selectedCount > 0 && (
                    <div className="space-y-1">
                      <p className="text-green-600 dark:text-green-400 font-medium">Selecionados</p>
                      <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                        {selectedCount} itens ({formatBytes(selectedSize)})
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Ações */}
            {(selectAll || deselectAll) && (
              <div className="flex items-center space-x-3">
                {selectedCount < items.length && selectAll && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => selectAll(category)}
                        className="bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                      >
                        <Square className="w-4 h-4" />
                        <span>Selecionar Todos</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Selecionar todos os itens desta categoria</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {selectedCount > 0 && deselectAll && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => deselectAll(category)}
                        className="bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>Limpar Seleção</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Limpar seleção desta categoria</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Lista de Arquivos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Arquivos Encontrados</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[70vh] overflow-y-auto">
            {items.map(it => (
              <div key={it.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <ItemRow item={it} selected={!!selected[it.id]} toggle={toggle} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}


