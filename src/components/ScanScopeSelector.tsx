import React from 'react'
import { ScanProfile } from '../types'
import { Shield, FolderPlus, Trash2 } from 'lucide-react'

const PROFILE_OPTIONS: { value: ScanProfile, label: string, description: string }[] = [
  { value: 'quick', label: 'Rápido', description: 'Menos categorias e menor superfície de leitura.' },
  { value: 'safe', label: 'Seguro', description: 'Equilíbrio entre cobertura e menor risco de bloqueio.' },
  { value: 'complete', label: 'Completo', description: 'Mais categorias, pode exigir permissões adicionais.' }
]

export function ScanScopeSelector({
  profile,
  directories,
  onProfileChange,
  onAddDirectory,
  onRemoveDirectory,
  disabled
}: {
  profile: ScanProfile
  directories: string[]
  onProfileChange: (profile: ScanProfile) => void
  onAddDirectory: () => void
  onRemoveDirectory: (targetPath: string) => void
  disabled?: boolean
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
        <Shield className="w-4 h-4" />
        Escopo de Análise e Permissões
      </div>

      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Perfil de scan</label>
        <select
          value={profile}
          disabled={disabled}
          onChange={(event) => onProfileChange(event.target.value as ScanProfile)}
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
              <button
                disabled={disabled || directories.length === 1}
                onClick={() => onRemoveDirectory(directory)}
                className="text-red-500 hover:text-red-600 disabled:opacity-40"
                title={directories.length === 1 ? 'Mantenha ao menos um diretório autorizado' : 'Remover diretório autorizado'}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
