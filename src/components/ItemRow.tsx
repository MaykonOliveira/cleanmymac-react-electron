import React from 'react'
import { CleanupItem, RiskLevel } from '../types'
import { formatBytes } from '../utils/format'
import { Folder, File, Calendar, Check, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'

const RISK_UI: Record<RiskLevel, { label: string; className: string; icon: React.ReactNode }> = {
  low: {
    label: 'Risco Baixo',
    className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    icon: <ShieldCheck className="w-3 h-3" />
  },
  medium: {
    label: 'Risco Médio',
    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    icon: <ShieldQuestion className="w-3 h-3" />
  },
  high: {
    label: 'Risco Alto',
    className: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    icon: <ShieldAlert className="w-3 h-3" />
  }
}

export function ItemRow({ item, selected, toggle }: {
  item: CleanupItem,
  selected: boolean,
  toggle: (id: string) => void
}) {
  const [showAllReasons, setShowAllReasons] = React.useState(false)
  const riskUi = RISK_UI[item.riskLevel]
  const visibleReasons = showAllReasons ? item.recommendationReasons : item.recommendationReasons.slice(0, 3)

  const recommendationLabel = item.riskLevel === 'low'
    ? 'Recomendado para limpeza'
    : item.riskLevel === 'medium'
      ? 'Revisão manual sugerida'
      : 'Atenção: alto risco'

  return (
    <div
      className={`group flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-150 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
        selected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-700' : 'bg-white dark:bg-gray-800 hover:shadow-sm'
      }`}
      onClick={() => toggle(item.id)}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
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

        <div className="flex items-center justify-between w-full sm:w-auto sm:flex-shrink-0 sm:text-right gap-2">
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

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${riskUi.className}`}>
          {riskUi.icon}
          {riskUi.label}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
          Score de segurança: {item.safetyScore}/100
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
          {recommendationLabel}
        </span>
      </div>

      <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300 pl-1">
        {visibleReasons.map((reason, index) => (
          <li key={`${item.id}-reason-${index}`} className="leading-relaxed">• {reason}</li>
        ))}
      </ul>
      {item.recommendationReasons.length > 3 && (
        <button
          type="button"
          className="self-start text-xs text-blue-600 dark:text-blue-300 hover:underline"
          onClick={(event) => {
            event.stopPropagation()
            setShowAllReasons((prev) => !prev)
          }}
        >
          {showAllReasons ? 'Mostrar menos detalhes' : `Ver explicação completa (${item.recommendationReasons.length} pontos)`}
        </button>
      )}
    </div>
  )
}
