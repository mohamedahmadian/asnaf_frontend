import { ChartPie, CircleCheck, Clock, FolderKanban, Landmark, LayoutDashboard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { useAuth } from '../auth/AuthProvider'
import { PageHeader, formShellClassName } from '../components/ui/Form'
import { FormCard, FormEmptyHint } from '../components/ui/FormLayout'
import { LoadingState } from '../components/ui/LoadingState'
import { api } from '../lib/api'
import { formatNumber } from '../lib/datetime'

type DashboardSummary = {
  total: number
  reviewed: number
  pending: number
  centers: { id: string; name: string }[]
}

const reviewedColor = '#2ebdb6'
const pendingColor = '#f5b942'
const emptyColor = '#e7f6f4'

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { user } = useAuth()
  const summary = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data,
  })
  const stats = summary.data
  const total = stats?.total ?? 0
  const reviewed = stats?.reviewed ?? 0
  const pending = stats?.pending ?? 0
  const slices = [
    { key: 'reviewed', name: t('dashboard.statsReviewed'), value: reviewed, fill: reviewedColor },
    { key: 'pending', name: t('dashboard.statsPending'), value: pending, fill: pendingColor },
  ].filter((item) => item.value > 0)
  const chartData = slices.length > 0 ? slices : [{ key: 'empty', name: '', value: 1, fill: emptyColor }]

  return (
    <div className={`${formShellClassName} space-y-5`}>
      <PageHeader
        icon={LayoutDashboard}
        title={t('dashboard.title')}
        subtitle={t('dashboard.welcomeUser', { name: user?.fullName ?? '' })}
      />
      <FormCard icon={ChartPie} title={t('dashboard.statsTitle')}>
        <div className="p-5 sm:p-6">
          {summary.isLoading ? <LoadingState /> : null}
          {stats ? (
            <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <StatTile icon={FolderKanban} label={t('dashboard.statsTotal')} value={total} locale={locale} tone="teal" />
                <StatTile icon={CircleCheck} label={t('dashboard.statsReviewed')} value={reviewed} locale={locale} tone="mint" />
                <StatTile icon={Clock} label={t('dashboard.statsPending')} value={pending} locale={locale} tone="amber" />
              </div>
              <div className="mx-auto w-full max-w-xs">
                <div className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={68}
                        outerRadius={92}
                        paddingAngle={slices.length > 1 ? 3 : 0}
                        stroke="#fff"
                        strokeWidth={3}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {chartData.map((item) => (
                          <Cell key={item.key} fill={item.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-semibold text-ink-900">{formatNumber(total, locale)}</span>
                    <span className="mt-0.5 text-[11px] text-ink-500">{t('dashboard.statsTotal')}</span>
                  </div>
                </div>
                <ul className="mt-2 space-y-1.5">
                  <ChartLegend color={reviewedColor} label={t('dashboard.statsReviewed')} value={reviewed} locale={locale} />
                  <ChartLegend color={pendingColor} label={t('dashboard.statsPending')} value={pending} locale={locale} />
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </FormCard>
      <FormCard icon={LayoutDashboard} title={t('dashboard.subtitle')}>
        <div className="flex min-h-64 items-center justify-center p-6 sm:p-10">
          {summary.isLoading ? <LoadingState /> : null}
          {stats && stats.centers.length > 0 ? (
            <div className="w-full max-w-lg rounded-[28px] border border-teal-100 bg-gradient-to-b from-white via-teal-50/40 to-mint-50 px-6 py-8 text-center shadow-[0_18px_40px_rgba(46,189,182,0.14)]">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_12px_24px_rgba(46,189,182,0.32)]">
                <Landmark className="size-7" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-medium text-ink-500">{t('dashboard.centersTitle')}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {stats.centers.map((center) => (
                  <span
                    key={center.id}
                    className="inline-flex rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-teal-800 shadow-[0_6px_16px_rgba(46,189,182,0.12)] ring-1 ring-teal-200"
                  >
                    {center.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {stats && stats.centers.length === 0 ? <FormEmptyHint>{t('dashboard.centersEmpty')}</FormEmptyHint> : null}
        </div>
      </FormCard>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  locale,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  locale: string
  tone: 'teal' | 'mint' | 'amber'
}) {
  const toneClass = {
    teal: 'border-teal-100 bg-gradient-to-b from-teal-50 to-white text-teal-600',
    mint: 'border-mint-100 bg-gradient-to-b from-mint-50 to-white text-mint-600',
    amber: 'border-amber-100 bg-gradient-to-b from-amber-50 to-white text-amber-600',
  }[tone]
  const iconClass = {
    teal: 'bg-teal-500 shadow-[0_10px_18px_rgba(46,189,182,0.28)]',
    mint: 'bg-mint-500 shadow-[0_10px_18px_rgba(63,214,190,0.28)]',
    amber: 'bg-amber-500 shadow-[0_10px_18px_rgba(245,185,66,0.28)]',
  }[tone]
  return (
    <article className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${toneClass}`}>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-white ${iconClass}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-ink-900">{formatNumber(value, locale)}</p>
      </div>
    </article>
  )
}

function ChartLegend({
  color,
  label,
  value,
  locale,
}: {
  color: string
  label: string
  value: number
  locale: string
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm text-ink-700">
      <span className="inline-flex min-w-0 items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="font-semibold text-ink-900">{formatNumber(value, locale)}</span>
    </li>
  )
}
