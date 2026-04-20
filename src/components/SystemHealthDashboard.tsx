import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TooltipContentProps } from 'recharts/types/component/Tooltip'
import { BarChart3, TrendingUp, Zap, Clock, HardDrive, Info, CheckCircle2, AlertTriangle } from 'lucide-react'
import { CleanupInsights, CleanupCategory } from '../types'
import { formatBytes } from '../utils/format'

interface SystemHealthDashboardProps {
  insights: CleanupInsights | null
}

const CATEGORY_COLORS: Record<CleanupCategory, string> = {
  'Cache': '#3b82f6',
  'Logs': '#a855f7',
  'Temporary': '#f59e0b',
  'Old Downloads': '#f97316',
  'Browser Cache': '#14b8a6',
  'App Support': '#ec4899',
}

const CATEGORY_LABELS: Record<CleanupCategory, string> = {
  'Cache': 'Cache',
  'Logs': 'Logs',
  'Temporary': 'Temporários',
  'Old Downloads': 'Downloads',
  'Browser Cache': 'Cache Navegador',
  'App Support': 'Suporte App',
}

const ALL_CATEGORIES: CleanupCategory[] = [
  'Cache', 'Logs', 'Temporary', 'Old Downloads', 'Browser Cache', 'App Support'
]

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatDateFull(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function bytesToGB(bytes: number): number {
  return parseFloat((bytes / (1024 ** 3)).toFixed(2))
}

function DiskRing({ usedBytes, totalBytes, freeBytes }: { usedBytes: number; totalBytes: number; freeBytes: number }) {
  const freePercent = totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0
  const usedPercent = 100 - freePercent

  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (usedPercent / 100) * circumference

  const ringColor =
    freePercent > 40 ? '#10b981' : freePercent > 15 ? '#f59e0b' : '#ef4444'
  const ringBg = 'currentColor'

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-gray-100 dark:text-gray-700"
          />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {usedPercent.toFixed(0)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">usado</span>
        </div>
      </div>
      <div className="flex gap-4 text-sm">
        <div className="text-center">
          <div className="font-semibold text-gray-900 dark:text-white">{formatBytes(freeBytes)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">livre</div>
        </div>
        <div className="w-px bg-gray-200 dark:bg-gray-700" />
        <div className="text-center">
          <div className="font-semibold text-gray-900 dark:text-white">{formatBytes(totalBytes)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">total</div>
        </div>
      </div>
    </div>
  )
}

interface InsightItem {
  type: 'info' | 'success' | 'warning'
  message: string
}

function generateInsights(insights: CleanupInsights): InsightItem[] {
  const result: InsightItem[] = []
  const history = insights.allHistory ?? insights.recentRuns
  const now = Date.now()
  const DAY = 86400000

  if (!history || history.length === 0) return result

  // "Sem limpezas recentes": lastCleanAt > 14 days ago or null
  const lastCleanAt = insights.timeline.lastCleanAt
  if (!lastCleanAt || now - lastCleanAt > 14 * DAY) {
    result.push({ type: 'warning', message: 'Sem limpezas recentes. Realize uma limpeza para manter o sistema saudável.' })
  }

  // "Limpeza frequente": ≥ 3 runs in last 30 days
  const last30 = history.filter(r => now - r.at < 30 * DAY)
  if (last30.length >= 3) {
    result.push({ type: 'success', message: `Ótimo ritmo! ${last30.length} limpezas nos últimos 30 dias.` })
  }

  // "Downloads Antigos cresceu": last 7 days avg > prev 7 days avg by > 20%
  const last7 = history.filter(r => now - r.at < 7 * DAY)
  const prev7 = history.filter(r => now - r.at >= 7 * DAY && now - r.at < 14 * DAY)
  if (last7.length > 0 && prev7.length > 0) {
    const avgLast7Downloads = last7.reduce((s, r) => s + (r.deletedByCategory['Old Downloads'] ?? 0), 0) / last7.length
    const avgPrev7Downloads = prev7.reduce((s, r) => s + (r.deletedByCategory['Old Downloads'] ?? 0), 0) / prev7.length
    if (avgPrev7Downloads > 0 && avgLast7Downloads > avgPrev7Downloads * 1.2) {
      result.push({ type: 'info', message: `Downloads Antigos cresceu ${Math.round(((avgLast7Downloads / avgPrev7Downloads) - 1) * 100)}% na última semana.` })
    }
  }

  // "Eficiência estável": last 3 runs avg within 10% of overall avg
  if (history.length >= 4) {
    const overallAvg = history.reduce((s, r) => s + r.deletedBytes, 0) / history.length
    const last3 = history.slice(0, 3)
    const last3Avg = last3.reduce((s, r) => s + r.deletedBytes, 0) / 3
    if (overallAvg > 0 && Math.abs(last3Avg - overallAvg) / overallAvg <= 0.1) {
      result.push({ type: 'success', message: 'Eficiência estável. Suas últimas 3 limpezas estão dentro da média histórica.' })
    }
  }

  return result
}

const InsightIcon = {
  info: <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />,
}

const InsightBg = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300',
  success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300',
}

// Custom recharts tooltip for consistent dark-mode styling
function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <div className="font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={String(entry.name)} className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}: {formatBytes(Number(entry.value ?? 0) * 1024 ** 3)}</span>
        </div>
      ))}
    </div>
  )
}

export function SystemHealthDashboard({ insights }: SystemHealthDashboardProps) {
  const history = useMemo(() => {
    const raw = insights?.allHistory ?? insights?.recentRuns ?? []
    return [...raw].sort((a, b) => a.at - b.at)
  }, [insights])

  const hasData = history.length > 0

  const trendData = useMemo(() =>
    history.map(run => ({
      date: formatDateShort(run.at),
      gb: bytesToGB(run.deletedBytes),
    })), [history])

  const categoryData = useMemo(() =>
    history.map(run => {
      const entry: Record<string, number | string> = { date: formatDateShort(run.at) }
      for (const cat of ALL_CATEGORIES) {
        const bytes = run.deletedByCategory[cat] ?? 0
        entry[CATEGORY_LABELS[cat]] = bytesToGB(bytes)
      }
      return entry
    }), [history])

  const avgPerClean = useMemo(() => {
    if (!insights || insights.totals.cleanActions === 0) return 0
    return insights.totals.bytesDeleted / insights.totals.cleanActions
  }, [insights])

  const insightItems = useMemo(() => insights ? generateInsights(insights) : [], [insights])

  const diskSpace = insights?.diskSpace

  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 dark:text-gray-500">
        <BarChart3 className="w-12 h-12 mb-4 opacity-40" />
        <p className="text-sm max-w-xs">Carregando dados de saúde do sistema…</p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Nenhum dado ainda</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Realize sua primeira limpeza para ver o painel de saúde.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Top row: Disk space + stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Disk space card */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 self-start">
            <HardDrive className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            Disco Principal
          </div>
          {diskSpace && diskSpace.totalBytes > 0 ? (
            <DiskRing
              usedBytes={diskSpace.usedBytes}
              totalBytes={diskSpace.totalBytes}
              freeBytes={diskSpace.freeBytes}
            />
          ) : (
            <div className="text-sm text-gray-400 dark:text-gray-500 py-6">Dados de disco indisponíveis</div>
          )}
        </div>

        {/* Stat cards */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Zap className="w-4 h-4 text-blue-500" />}
            label="Total de limpezas"
            value={insights.totals.cleanActions.toString()}
            sub="sessões"
            color="blue"
          />
          <StatCard
            icon={<BarChart3 className="w-4 h-4 text-emerald-500" />}
            label="Espaço liberado"
            value={formatBytes(insights.totals.bytesDeleted)}
            sub="no total"
            color="emerald"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
            label="Média por limpeza"
            value={formatBytes(avgPerClean)}
            sub="por sessão"
            color="purple"
          />
          <StatCard
            icon={<Clock className="w-4 h-4 text-amber-500" />}
            label="Última limpeza"
            value={insights.timeline.lastCleanAt ? formatDateFull(insights.timeline.lastCleanAt) : 'Nunca'}
            sub="&nbsp;"
            color="amber"
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Area chart — trend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Espaço Liberado por Sessão</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-700" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-gray-400 dark:text-gray-500"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `${v} GB`}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-gray-400 dark:text-gray-500"
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={(props) => <ChartTooltip {...props} />} />
              <Area
                type="monotone"
                dataKey="gb"
                name="Liberado (GB)"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#emeraldGrad)"
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stacked bar chart — by category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Limpeza por Categoria</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-700" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-gray-400 dark:text-gray-500"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `${v} GB`}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-gray-400 dark:text-gray-500"
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={(props) => <ChartTooltip {...props} />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(value) => <span className="text-gray-600 dark:text-gray-300">{value}</span>}
              />
              {ALL_CATEGORIES.map(cat => (
                <Bar
                  key={cat}
                  dataKey={CATEGORY_LABELS[cat]}
                  stackId="cats"
                  fill={CATEGORY_COLORS[cat]}
                  maxBarSize={36}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      {insightItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Insights</h3>
          <div className="space-y-2">
            {insightItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${InsightBg[item.type]}`}
              >
                {InsightIcon[item.type]}
                <span>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: 'blue' | 'emerald' | 'purple' | 'amber'
}) {
  const bgMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2">
      <div className={`w-7 h-7 rounded-lg ${bgMap[color]} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide leading-none mb-1">{label}</div>
        <div className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</div>
        <div
          className="text-xs text-gray-400 dark:text-gray-500 mt-0.5"
          dangerouslySetInnerHTML={{ __html: sub }}
        />
      </div>
    </div>
  )
}
