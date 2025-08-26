import React from 'react'
import { Search, Trash2, Loader2, Menu } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

export function Header({ isScanning, onScan, canClean, onClean, sidebarOpen, onToggleSidebar }: { 
  isScanning: boolean, 
  onScan: () => void, 
  canClean: boolean, 
  onClean: () => void,
  sidebarOpen: boolean,
  onToggleSidebar: () => void
}) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
          title={sidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Mostrar sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-light text-gray-800 dark:text-gray-200 tracking-tight truncate">
          <span className="hidden sm:inline">CleanMyMac Pro</span>
          <span className="sm:hidden">CleanMyMac</span>
        </h1>
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
        <ThemeToggle />
        {isScanning ? (
          <div className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 hidden sm:inline">
              Analisando sistema...
            </span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 sm:hidden">
              Analisando...
            </span>
          </div>
        ) : (
          <button 
            onClick={onScan} 
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg shadow-sm transition-colors flex items-center space-x-1 sm:space-x-2"
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Analisar Sistema</span>
            <span className="sm:hidden text-xs">Analisar</span>
          </button>
        )}
        {canClean && (
          <button 
            onClick={onClean} 
            className="bg-red-500 hover:bg-red-600 text-white font-medium px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg shadow-sm transition-colors flex items-center space-x-1 sm:space-x-2"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Limpar Arquivos</span>
            <span className="sm:hidden text-xs">Limpar</span>
          </button>
        )}
      </div>
    </header>
  )
}


