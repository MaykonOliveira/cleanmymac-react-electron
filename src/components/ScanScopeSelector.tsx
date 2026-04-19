import React, { useState, useCallback } from 'react'
import { ReminderFrequency, ScanProfile } from '../types'
import { Shield, FolderPlus, Trash2, CalendarClock, BarChart3, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

const PROFILE_OPTIONS: { value: ScanProfile, label: string, description: string }[] = [
  { value: 'quick', label: 'Rápido', description: 'Menos categorias e menor superfície de leitura.' },
  { value: 'safe', label: 'Seguro', description: 'Equilíbrio entre cobertura e menor risco de bloqueio.' },
  { value: 'complete', label: 'Completo', description: 'Mais categorias, pode exigir permissões adicionais.' }
]

const REMINDER_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: 'off', label: 'Desativado' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' }
]

export function ScanScopeSelector({
  profile,
  directories,
  reminderFrequency,
  metricsEnabled,
  onProfileChange,
  onAddDirectory,
  onRemoveDirectory,
  onReminderFrequencyChange,
  onMetricsOptInChange,
  disabled
}: {
  profile: ScanProfile
  directories: string[]
  reminderFrequency: ReminderFrequency
  metricsEnabled: boolean
  onProfileChange: (profile: ScanProfile) => void
  onAddDirectory: () => void
  onRemoveDirectory: (targetPath: string) => void
  onReminderFrequencyChange: (frequency: ReminderFrequency) => void
  onMetricsOptInChange: (enabled: boolean) => void
  disabled?: boolean
}) {
  const [collapsed, setCollapsed] = useState(true)
  const [savedField, setSavedField] = useState<string | null>(null)

  const flashSaved = useCallback((field: string) => {
    setSavedField(field)
    setTimeout(() => setSavedField(null), 1500)
  }, [])

  return (
    <TooltipProvider>
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-4">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          Escopo de Análise e Permissões
          {collapsed && (
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
              · {profile === 'quick' ? 'Rápido' : profile === 'safe' ? 'Seguro' : 'Completo'}
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
      </button>

      {!collapsed && <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500 dark:text-gray-400">Perfil de scan</label>
          {savedField === 'profile' && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Salvo
            </span>
          )}
        </div>
        <select
          value={profile}
          disabled={disabled}
          onChange={(event) => { onProfileChange(event.target.value as ScanProfile); flashSaved('profile') }}
          className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm"
        >
          {PROFILE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} — {option.description}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500 dark:text-gray-400">Pastas autorizadas</label>
          <button
            disabled={disabled}
            onClick={onAddDirectory}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60"
          >
            <FolderPlus className="w-3 h-3" />
            Selecionar pasta para análise
          </button>
        </div>
        <div className="mt-2 space-y-2 max-h-36 overflow-auto">
          {directories.map((directory) => (
            <div key={directory} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900 rounded-lg px-2 py-2 border border-gray-200 dark:border-gray-700">
              <span className="truncate pr-2">{directory}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={directories.length === 1 ? 'cursor-not-allowed' : ''}>
                    <button
                      disabled={disabled || directories.length === 1}
                      onClick={() => onRemoveDirectory(directory)}
                      className="text-red-500 hover:text-red-600 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                </TooltipTrigger>
                {directories.length === 1 && (
                  <TooltipContent side="left">
                    <p>Mantenha ao menos um diretório autorizado</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              Agendamento de análise
            </label>
            {savedField === 'reminder' && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Salvo
              </span>
            )}
          </div>
          <select
            value={reminderFrequency}
            disabled={disabled}
            onChange={(event) => { onReminderFrequencyChange(event.target.value as ReminderFrequency); flashSaved('reminder') }}
            className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm"
          >
            {REMINDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Métricas locais anônimas
            </label>
            {savedField === 'metrics' && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Salvo
              </span>
            )}
          </div>
          <button
            disabled={disabled}
            onClick={() => { onMetricsOptInChange(!metricsEnabled); flashSaved('metrics') }}
            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${metricsEnabled
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
              : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
            }`}
          >
            {metricsEnabled ? 'Ativado (opt-in)' : 'Desativado'}
          </button>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Guarda apenas contadores locais (scans, seleção, limpeza). Nenhum envio externo.
          </p>
        </div>
      </div>
      </div>}
    </div>
    </TooltipProvider>
  )
}
