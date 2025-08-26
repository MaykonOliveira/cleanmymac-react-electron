import React from 'react'
import { CleanupItem } from '../types'
import { formatBytes } from '../utils/format'
import { Folder, File, Calendar, Check } from 'lucide-react'

export function ItemRow({ item, selected, toggle }: { 
  item: CleanupItem, 
  selected: boolean, 
  toggle: (id: string) => void 
}) {
  return (
    <div 
      className={`group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-150 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
        selected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-700' : 'bg-white dark:bg-gray-800 hover:shadow-sm'
      }`}
      onClick={() => toggle(item.id)}
    >
      <div className="flex items-center gap-3 sm:gap-4 w-full sm:flex-1">
        <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center transition-all ${
          selected 
            ? 'bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600' 
            : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-blue-500 bg-white dark:bg-gray-700'
        }`}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
        
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
            item.type === 'directory' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            {item.type === 'directory' ? (
              <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <File className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
            )}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{item.name}</div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{item.path}</div>
          {item.lastModified && (
            <div className="flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500 mt-1 sm:hidden">
              <Calendar className="w-3 h-3" />
              <span>Modificado: {new Date(item.lastModified).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between w-full sm:w-auto sm:flex-shrink-0 sm:text-right">
        <div className="sm:hidden">
          <div className={`text-xs px-2 py-1 rounded-full inline-block ${
            item.type === 'directory' 
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {item.type === 'directory' ? 'Pasta' : 'Arquivo'}
          </div>
        </div>
        
        <div className="text-right">
          <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{formatBytes(item.size)}</div>
          <div className={`hidden sm:block text-xs mt-1 px-3 py-1 rounded-full w-16 text-center ${
            item.type === 'directory' 
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {item.type === 'directory' ? 'Pasta' : 'Arquivo'}
          </div>
          {item.lastModified && (
            <div className="hidden sm:flex items-center justify-end space-x-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
              <Calendar className="w-3 h-3" />
              <span>Modificado: {new Date(item.lastModified).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


