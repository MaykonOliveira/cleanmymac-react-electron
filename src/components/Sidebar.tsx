import React from 'react'
import { CleanupCategory, CATEGORY_ORDER, CleanupItem } from '../types'
import { formatBytes } from '../utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { HardDrive, CheckCircle, FolderOpen, Plus, X } from 'lucide-react'

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
    <aside className="w-80 bg-gray-50 border-r border-gray-200 p-6 overflow-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Resumo do Sistema</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Espaço Total</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{formatBytes(totalSize)}</span>
          </div>
          {selectedSize > 0 && (
            <div className="flex items-center justify-between py-2 bg-green-50 rounded-lg px-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-green-800">Selecionado para Limpeza</span>
              </div>
              <span className="text-sm font-semibold text-green-900">{formatBytes(selectedSize)}</span>
            </div>
          )}
        </div>
      </div>

      {isScanning && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Analisando sistema...</span>
              <span className="text-sm font-semibold text-blue-600">{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Categorias</h2>
        <div className="space-y-3">
          {CATEGORY_ORDER.map(cat => {
            const list = grouped[cat]
            if (!list || list.length === 0) return (
              <div key={cat} className="flex items-center space-x-3 py-3 opacity-40">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-400">{cat}</span>
              </div>
            )
            const size = list.reduce((a, b) => a + b.size, 0)
            const selCount = list.filter(i => selected[i.id]).length
            return (
              <div key={cat} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{cat}</div>
                      <div className="text-xs text-gray-500">
                        {list.length} itens • {formatBytes(size)}
                      </div>
                    </div>
                  </div>
                  {selCount > 0 && (
                    <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                      {selCount} selecionados
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => selectAll(cat)} 
                    className="flex-1 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 font-medium py-1.5 px-3 rounded-lg text-xs transition-colors"
                  >
                    Selecionar Todos
                  </button>
                  <button 
                    onClick={() => deselectAll(cat)} 
                    className="bg-white border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 font-medium py-1.5 px-3 rounded-lg text-xs transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}


