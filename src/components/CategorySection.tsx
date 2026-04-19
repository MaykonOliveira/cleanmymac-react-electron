import React from 'react'
import { CleanupCategory, CleanupItem, CATEGORY_INFO } from '../types'
import { ItemRow } from './ItemRow'
import { FolderOpen, Info, ShieldAlert, ShieldCheck, ShieldQuestion, CheckCircle, CheckSquare, Square } from 'lucide-react'
import { formatBytes } from '../utils/format'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

export function CategorySection({ category, items, selected, toggle, selectAll, deselectAll, hasBeenScanned }: {
  category: CleanupCategory,
  items: CleanupItem[],
  selected: Record<string, boolean>,
  toggle: (id: string) => void,
  selectAll?: (category: CleanupCategory) => void,
  deselectAll?: (category: CleanupCategory) => void,
  hasBeenScanned?: boolean
}) {
  const categoryInfo = CATEGORY_INFO[category]

  if (!items || items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            hasBeenScanned
              ? 'bg-emerald-100 dark:bg-emerald-900/30'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            {hasBeenScanned
              ? <CheckCircle className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
              : <FolderOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            }
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{categoryInfo.label}</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {hasBeenScanned
                ? 'Nenhum arquivo encontrado. Está tudo limpo!'
                : "Clique em 'Analisar Sistema' para verificar esta categoria."
              }
            </p>
          </div>
        </div>
      </div>
    )
  }

  const selectedCount = items.filter(item => selected[item.id]).length
  const totalSize = items.reduce((acc, item) => acc + item.size, 0)
  const selectedSize = items.filter(item => selected[item.id]).reduce((acc, item) => acc + item.size, 0)
  const avgSafety = Math.round(items.reduce((acc, item) => acc + item.safetyScore, 0) / items.length)
  const riskCounts = items.reduce(
    (acc, item) => { acc[item.riskLevel] += 1; return acc },
    { low: 0, medium: 0, high: 0 }
  )

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Compact header card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{categoryInfo.label}</h1>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                        aria-label={`Informações sobre ${categoryInfo.label}`}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>{categoryInfo.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatBytes(totalSize)}</span>
                  <span>·</span>
                  <span>{items.length} itens</span>
                  <span>·</span>
                  <span>Score {avgSafety}/100</span>
                </div>

                {/* Risk + selection badges */}
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {riskCounts.low > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                      <ShieldCheck className="w-3 h-3" /> {riskCounts.low}
                    </span>
                  )}
                  {riskCounts.medium > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                      <ShieldQuestion className="w-3 h-3" /> {riskCounts.medium}
                    </span>
                  )}
                  {riskCounts.high > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
                      <ShieldAlert className="w-3 h-3" /> {riskCounts.high}
                    </span>
                  )}
                  {selectedCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      <CheckSquare className="w-3 h-3" /> {selectedCount} sel. · {formatBytes(selectedSize)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {(selectAll || deselectAll) && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedCount < items.length && selectAll && (
                  <button
                    onClick={() => selectAll(category)}
                    aria-label={`Selecionar todos os itens de ${categoryInfo.label}`}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium"
                  >
                    <Square className="w-3 h-3" />
                    <span className="hidden sm:inline">Selecionar todos</span>
                  </button>
                )}
                {selectedCount > 0 && deselectAll && (
                  <button
                    onClick={() => deselectAll(category)}
                    aria-label={`Limpar seleção de ${categoryInfo.label}`}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium"
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span className="hidden sm:inline">Limpar seleção</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Arquivos Encontrados</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{items.length} itens</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
            {items.map(it => (
              <div key={it.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <ItemRow item={it} selected={!!selected[it.id]} toggle={toggle} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
