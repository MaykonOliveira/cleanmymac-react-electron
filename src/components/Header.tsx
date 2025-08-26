import React from 'react'
import { Search, Trash2, Loader2 } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

export function Header({ isScanning, onScan, canClean, onClean }: { 
  isScanning: boolean, 
  onScan: () => void, 
  canClean: boolean, 
  onClean: () => void 
}) {
  return (
    <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
          <Search className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-light text-gray-800 tracking-tight">CleanMyMac Pro</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        {isScanning ? (
          <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Analisando sistema...</span>
          </div>
        ) : (
          <button 
            onClick={onScan} 
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>Analisar Sistema</span>
          </button>
        )}
        {canClean && (
          <button 
            onClick={onClean} 
            className="bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Arquivos</span>
          </button>
        )}
      </div>
    </header>
  )
}


