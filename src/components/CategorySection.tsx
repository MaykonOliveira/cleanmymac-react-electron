import React, { useState } from 'react'
import { CleanupCategory, CleanupItem, CATEGORY_INFO } from '../types'
import { ItemRow } from './ItemRow'
import { ChevronDown, ChevronRight, FolderOpen, Info, CheckSquare, Square } from 'lucide-react'
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
  const [isOpen, setIsOpen] = useState(false)
  const categoryInfo = CATEGORY_INFO[category]
  
  if (!items || items.length === 0) return null
  
  const selectedCount = items.filter(item => selected[item.id]).length
  const totalSize = items.reduce((acc, item) => acc + item.size, 0)
  const selectedSize = items.filter(item => selected[item.id]).reduce((acc, item) => acc + item.size, 0)
  
  return (
    <TooltipProvider>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
        <div 
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {isOpen ? (
                <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              )}
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{categoryInfo.label}</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{categoryInfo.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span>{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
              <span>•</span>
              <span>{formatBytes(totalSize)}</span>
              {selectedCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {selectedCount} selecionados ({formatBytes(selectedSize)})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedCount > 0 && (
            <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium px-3 py-1 rounded-full">
              {selectedCount}/{items.length}
            </div>
          )}
          
          {(selectAll || deselectAll) && (
            <div className="flex items-center space-x-1">
              {selectedCount < items.length && selectAll && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        selectAll(category)
                      }}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Square className="w-4 h-4" />
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
                      onClick={(e) => {
                        e.stopPropagation()
                        deselectAll(category)
                      }}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <CheckSquare className="w-4 h-4" />
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
      
      {isOpen && (
        <div className="p-6 space-y-2 bg-gray-50 dark:bg-gray-900">
          {items.map(it => (
            <ItemRow key={it.id} item={it} selected={!!selected[it.id]} toggle={toggle} />
          ))}
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}


