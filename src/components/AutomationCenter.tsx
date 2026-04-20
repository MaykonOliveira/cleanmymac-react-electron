import React, { useState } from 'react'
import {
  AutomationRule,
  AutomationRunLog,
  AutomationSettings,
  AUTOMATION_TEMPLATES,
  AutomationFrequency,
  AutomationMode,
  ScanProfile
} from '../types'
import { formatBytes } from '../utils/format'
import {
  Zap,
  Plus,
  Trash2,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Clock,
  HardDrive,
  Activity,
  CheckCircle,
  AlertCircle,
  SkipForward,
  XCircle,
  Sparkles
} from 'lucide-react'

const FREQUENCY_LABELS: Record<AutomationFrequency, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal'
}

const MODE_LABELS: Record<AutomationMode, string> = {
  suggest: 'Sugerir',
  auto: 'Automático'
}

const PROFILE_LABELS: Record<ScanProfile, string> = {
  quick: 'Rápido',
  safe: 'Seguro',
  complete: 'Completo'
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`
}))

const STATUS_ICON: Record<AutomationRunLog['status'], React.ReactNode> = {
  success: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
  partial: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
  skipped: <SkipForward className="w-3.5 h-3.5 text-gray-400" />,
  error: <XCircle className="w-3.5 h-3.5 text-red-500" />
}

const STATUS_LABEL: Record<AutomationRunLog['status'], string> = {
  success: 'Concluído',
  partial: 'Parcial',
  skipped: 'Ignorado',
  error: 'Erro'
}

type RuleFormData = {
  name: string
  frequency: AutomationFrequency
  windowHour: number
  diskThresholdPercent: number
  mode: AutomationMode
  profile: ScanProfile
  enabled: boolean
}

const DEFAULT_FORM: RuleFormData = {
  name: '',
  frequency: 'weekly',
  windowHour: 3,
  diskThresholdPercent: 0,
  mode: 'suggest',
  profile: 'safe',
  enabled: true
}

function RuleForm({
  initial,
  onSave,
  onCancel
}: {
  initial?: RuleFormData
  onSave: (data: RuleFormData) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<RuleFormData>(initial ?? DEFAULT_FORM)

  function set<K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Nome</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ex: Limpeza semanal"
          className="mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Frequência</label>
          <select
            value={form.frequency}
            onChange={(e) => set('frequency', e.target.value as AutomationFrequency)}
            className="mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm"
          >
            <option value="daily">Diária</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Horário</label>
          <select
            value={form.windowHour}
            onChange={(e) => set('windowHour', Number(e.target.value))}
            className="mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm"
          >
            {HOUR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Modo</label>
          <select
            value={form.mode}
            onChange={(e) => set('mode', e.target.value as AutomationMode)}
            className="mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm"
          >
            <option value="suggest">Sugerir limpeza</option>
            <option value="auto">Executar automaticamente</option>
          </select>
          {form.mode === 'auto' && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              Remove automaticamente apenas itens de risco baixo
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Perfil de scan</label>
          <select
            value={form.profile}
            onChange={(e) => set('profile', e.target.value as ScanProfile)}
            className="mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm"
          >
            <option value="quick">Rápido</option>
            <option value="safe">Seguro</option>
            <option value="complete">Completo</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          Ativar só se disco livre estiver abaixo de (%)
        </label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="number"
            min={0}
            max={100}
            value={form.diskThresholdPercent}
            onChange={(e) => set('diskThresholdPercent', Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {form.diskThresholdPercent === 0 ? 'Desativado (executar sempre)' : `Executar se livre < ${form.diskThresholdPercent}%`}
          </span>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={!form.name.trim()}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg py-2 font-medium transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg py-2 font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function RuleCard({
  rule,
  onToggle,
  onDelete,
  onEdit
}: {
  rule: AutomationRule
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  onEdit: (rule: AutomationRule) => void
}) {
  return (
    <div className={`border rounded-xl p-4 transition-all ${
      rule.enabled
        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{rule.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              rule.mode === 'auto'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            }`}>
              {MODE_LABELS[rule.mode]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {FREQUENCY_LABELS[rule.frequency]} às {String(rule.windowHour).padStart(2, '0')}:00
            </span>
            <span>{PROFILE_LABELS[rule.profile]}</span>
            {rule.diskThresholdPercent > 0 && (
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                livre &lt; {rule.diskThresholdPercent}%
              </span>
            )}
            {rule.lastRunAt && (
              <span>Último: {new Date(rule.lastRunAt).toLocaleDateString('pt-BR')}</span>
            )}
            {rule.nextRunAt && rule.enabled && (
              <span>Próximo: {new Date(rule.nextRunAt).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(rule.id, !rule.enabled)}
            title={rule.enabled ? 'Pausar' : 'Ativar'}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
          >
            {rule.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onEdit(rule)}
            title="Editar"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors text-xs font-medium"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            title="Remover"
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function LogEntry({ log }: { log: AutomationRunLog }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="mt-0.5 shrink-0">{STATUS_ICON[log.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{log.ruleName}</span>
          <span className="text-[11px] text-gray-400 shrink-0">{new Date(log.at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          <span className={`font-medium ${
            log.status === 'success' ? 'text-emerald-600 dark:text-emerald-400'
              : log.status === 'error' ? 'text-red-600 dark:text-red-400'
                : log.status === 'partial' ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-500'
          }`}>
            {STATUS_LABEL[log.status]}
          </span>
          {log.mode === 'auto' && log.itemsDeleted > 0 && (
            <> · {log.itemsDeleted} itens ({formatBytes(log.bytesDeleted)})</>
          )}
          {log.mode === 'suggest' && log.itemsFound > 0 && (
            <> · {log.itemsFound} itens encontrados</>
          )}
          {log.message && <> · {log.message}</>}
        </div>
      </div>
    </div>
  )
}

export function AutomationCenter({
  automation,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule
}: {
  automation: AutomationSettings
  onCreateRule: (rule: Omit<AutomationRule, 'id' | 'createdAt'>) => void
  onUpdateRule: (id: string, patch: Partial<Omit<AutomationRule, 'id' | 'createdAt'>>) => void
  onDeleteRule: (id: string) => void
  onToggleRule: (id: string, enabled: boolean) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [showLogs, setShowLogs] = useState(false)

  function handleSaveNew(data: RuleFormData) {
    onCreateRule(data)
    setShowForm(false)
  }

  function handleSaveEdit(data: RuleFormData) {
    if (!editingRule) return
    onUpdateRule(editingRule.id, data)
    setEditingRule(null)
  }

  function applyTemplate(templateId: string) {
    const tpl = AUTOMATION_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    onCreateRule(tpl.rule)
  }

  const activeCount = automation.rules.filter((r) => r.enabled).length

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-4">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Centro de Automação</span>
          {activeCount > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
              {activeCount} ativa{activeCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingRule(null) }}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
        >
          <Plus className="w-3 h-3" />
          Nova regra
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Templates */}
        {automation.rules.length === 0 && !showForm && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Templates prontos</span>
            </div>
            <div className="grid gap-2">
              {AUTOMATION_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  className="flex items-start gap-3 text-left p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                >
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {tpl.name}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{tpl.description}</div>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* New rule form */}
        {showForm && !editingRule && (
          <RuleForm
            onSave={handleSaveNew}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Rules list */}
        {automation.rules.length > 0 && (
          <div className="space-y-2">
            {automation.rules.map((rule) => (
              editingRule?.id === rule.id ? (
                <RuleForm
                  key={rule.id}
                  initial={{
                    name: rule.name,
                    frequency: rule.frequency,
                    windowHour: rule.windowHour,
                    diskThresholdPercent: rule.diskThresholdPercent,
                    mode: rule.mode,
                    profile: rule.profile as ScanProfile,
                    enabled: rule.enabled
                  }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingRule(null)}
                />
              ) : (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={onToggleRule}
                  onDelete={onDeleteRule}
                  onEdit={(r) => { setEditingRule(r); setShowForm(false) }}
                />
              )
            ))}

            {/* Add template button when rules exist */}
            {!showForm && !editingRule && automation.rules.length > 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-2 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Adicionar regra
              </button>
            )}
          </div>
        )}

        {/* Logs */}
        {automation.logs.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
            <button
              onClick={() => setShowLogs((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              Histórico de execuções ({automation.logs.length})
              {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showLogs && (
              <div className="mt-2 max-h-64 overflow-y-auto">
                {automation.logs.slice(0, 30).map((log, i) => (
                  <LogEntry key={`${log.ruleId}-${log.at}-${i}`} log={log} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
