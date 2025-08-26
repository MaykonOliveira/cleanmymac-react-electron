import React, { useState } from 'react'
import { CleanupCategory, CleanupItem } from '../types'
import { ItemRow } from './ItemRow'
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react'
import { formatBytes } from '../utils/format'

export function CategorySection({ category, items, selected, toggle }: {
  category: CleanupCategory,
  items: CleanupItem[],
  selected: Record<string, boolean>,
  toggle: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  
  if (!items || items.length === 0) return null
  
  const selectedCount = items.filter(item => selected[item.id]).length
  const totalSize = items.reduce((acc, item) => acc + item.size, 0)
  const selectedSize = items.filter(item => selected[item.id]).reduce((acc, item) => acc + item.size, 0)
  
  return (
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
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{category}</h3>
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
        
        {selectedCount > 0 && (
          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium px-3 py-1 rounded-full">
            {selectedCount}/{items.length}
          </div>
        )}
      </div>
      
      {isOpen && (
        <div className="p-6 space-y-2 bg-gray-50 dark:bg-gray-900">
          {items.map(it => (
            <ItemRow key={it.id} item={it} selected={!!selected[it.id]} toggle={toggle} />
          ))}
        </div>
      )}
    </div>
  )
}


