import React from 'react'
import { CleanupInsights } from '../types'
import { formatBytes } from '../utils/format'
import { Sparkles, Trash2, HardDrive, Clock3 } from 'lucide-react'

function formatDate(value?: number): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function CleanupInsightsPanel({ insights }: { insights: CleanupInsights | null }) {
  if (!insights) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
        <Sparkles className="w-4 h-4 text-blue-500" />
        Resumo de impacto
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Limpezas concluídas
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{insights.totals.cleanActions}</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Itens removidos</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{insights.totals.itemsDeleted}</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
            <HardDrive className="w-3 h-3" /> Espaço recuperado
          </div>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-300">{formatBytes(insights.totals.bytesDeleted)}</div>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
        <Clock3 className="w-3 h-3" />
        Última limpeza: {formatDate(insights.timeline.lastCleanAt)}
      </div>
    </div>
  )
}
