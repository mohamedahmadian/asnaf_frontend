import { AlarmClock, BadgeCheck, Clock3, ScanSearch, type LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { PageHeader, caseShellClassName } from '../../components/ui/Form'
import { PaginationBar, SearchBar, SortableTh, TableCard } from '../../components/ui/ListControls'
import { FormField } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { inquiryMenuTitle } from '../../lib/inquiry-menu-label'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import { InquiryDateBadge, InquiryElapsedBadge } from './InquiryDateBadges'
import type { CaseInquiryChannel, CaseInquiryStatus } from './inquiry-types'

type InboxRow = {
  id: string
  status: CaseInquiryStatus
  channel: CaseInquiryChannel | null
  createdAt: string
  referredAt: string | null
  decidedAt: string | null
  centerName: string
  applicantName: string
  nationalId: string | null
  trackingCode: string | null
  unitTitle: string | null
  jobTitle: string | null
}

type InboxCenter = {
  id: string
  name: string
}

const inquiryViews = ['referred', 'decided', 'reviewing', 'overdue'] as const

type InquiryView = (typeof inquiryViews)[number]

function inquiryViewOf(value: string): InquiryView {
  return inquiryViews.includes(value as InquiryView) ? (value as InquiryView) : 'referred'
}

type InquiryStatsData = {
  referred: number
  decided: number
  reviewing: number
  overdue: number
}

function InquiryInboxStats({ active, onSelect }: { active: InquiryView; onSelect: (view: InquiryView) => void }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const stats = useQuery({
    queryKey: ['cases', 'inquiries-stats'],
    queryFn: async () => (await api.get<InquiryStatsData>('/cases/inquiries/stats')).data,
  })
  if (stats.isLoading && !stats.data) {
    return (
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
        <div className="h-[4.75rem] animate-pulse rounded-2xl bg-teal-50" />
        <div className="h-[4.75rem] animate-pulse rounded-2xl bg-mint-50" />
        <div className="h-[4.75rem] animate-pulse rounded-2xl bg-teal-50" />
        <div className="h-[4.75rem] animate-pulse rounded-2xl bg-amber-50" />
      </div>
    )
  }
  if (!stats.data) return null
  const cards: { view: InquiryView; icon: LucideIcon; label: string; value: number; tone: 'teal' | 'mint' | 'amber' }[] = [
    { view: 'referred', icon: ScanSearch, label: t('cases.inquiryStatsReferred'), value: stats.data.referred, tone: 'teal' },
    { view: 'decided', icon: BadgeCheck, label: t('cases.inquiryStatsDecided'), value: stats.data.decided, tone: 'mint' },
    { view: 'reviewing', icon: Clock3, label: t('cases.inquiryStatsReviewing'), value: stats.data.reviewing, tone: 'teal' },
    { view: 'overdue', icon: AlarmClock, label: t('cases.inquiryStatsOverdue'), value: stats.data.overdue, tone: 'amber' },
  ]
  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <InquiryStatCard
          key={card.view}
          {...card}
          locale={locale}
          active={card.view === active}
          onSelect={() => onSelect(card.view)}
        />
      ))}
    </section>
  )
}

function InquiryStatCard({
  icon: Icon,
  label,
  value,
  locale,
  tone,
  active,
  onSelect,
}: {
  icon: LucideIcon
  label: string
  value: number
  locale: string
  tone: 'teal' | 'mint' | 'amber'
  active: boolean
  onSelect: () => void
}) {
  const wrap = {
    teal: 'border-teal-100 bg-gradient-to-b from-teal-50 to-white',
    mint: 'border-mint-100 bg-gradient-to-b from-mint-50 to-white',
    amber: 'border-amber-100 bg-gradient-to-b from-amber-50 to-white',
  }[tone]
  const iconClass = {
    teal: 'bg-teal-500 shadow-[0_10px_18px_rgba(46,189,182,0.28)]',
    mint: 'bg-mint-500 shadow-[0_10px_18px_rgba(63,214,190,0.28)]',
    amber: 'bg-amber-500 shadow-[0_10px_18px_rgba(245,158,11,0.28)]',
  }[tone]
  const activeRing = {
    teal: 'ring-2 ring-teal-400',
    mint: 'ring-2 ring-mint-400',
    amber: 'ring-2 ring-amber-400',
  }[tone]
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 text-start shadow-[0_8px_22px_rgba(46,189,182,0.08)] transition hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${wrap} ${active ? activeRing : ''}`}
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-white ${iconClass}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-ink-900">{formatNumber(value, locale)}</p>
      </div>
    </button>
  )
}

const STATUSES: CaseInquiryStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

const statusBadgeClass: Record<CaseInquiryStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  APPROVED: 'bg-teal-50 text-teal-800 ring-teal-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
}

export function CaseInquiriesListPage({
  apiPath = '/cases/inquiries',
  viewBase = '/cases/inquiries',
  titleKey = 'menus.caseInquiries',
  subtitleKey = 'cases.inquiriesSubtitle',
  emptyKey = 'cases.inquiriesListEmpty',
  noResultsKey = 'cases.inquiriesNoResults',
  icon: Icon = ScanSearch,
  queryScope = 'inquiries',
}: {
  apiPath?: string
  viewBase?: string
  titleKey?: string
  subtitleKey?: string
  emptyKey?: string
  noResultsKey?: string
  icon?: LucideIcon
  queryScope?: string
} = {}) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams, clearParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const status = searchParams.get('status') ?? ''
  const inquiryView = queryScope === 'inquiries' ? inquiryViewOf(searchParams.get('inquiryView') ?? '') : 'referred'
  const query = useQuery({
    queryKey: ['cases', queryScope, q, page, status, inquiryView, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<InboxRow> & { centers: InboxCenter[] }>(apiPath, {
        params: {
          q,
          page,
          status: status || undefined,
          ...(queryScope === 'inquiries' && inquiryView !== 'referred' ? { inquiryView } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const centers = query.data?.centers ?? []

  function selectInquiryView(next: InquiryView) {
    setParams({ inquiryView: next === 'referred' || next === inquiryView ? undefined : next }, { resetPage: true })
  }

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Icon}
        title={
          queryScope === 'inquiries'
            ? inquiryMenuTitle('cases.inquiries', user?.inquiryCenters, t, titleKey)
            : t(titleKey)
        }
        subtitle={
          queryScope === 'places' ? (
            t(subtitleKey)
          ) : centers.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {centers.map((center) => (
                <span
                  key={center.id}
                  className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200"
                >
                  {center.name}
                </span>
              ))}
            </span>
          ) : null
        }
      />
      {queryScope === 'inquiries' ? <InquiryInboxStats active={inquiryView} onSelect={selectInquiryView} /> : null}
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={applySearch}
        label={t('cases.inquiriesSearch')}
        placeholder={t('cases.inquiriesSearchPlaceholder')}
        filtersActive={Boolean(status)}
        onClearFilters={() => clearParams(['status'])}
        extra={
          <FormField icon={ScanSearch} label={t('cases.inquiryStatus')} htmlFor="inquiry-status-filter">
            <SearchSelect
              id="inquiry-status-filter"
              value={status}
              onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
              placeholder={t('cases.inquiryAllStatuses')}
              options={[
                { value: '', label: t('cases.inquiryAllStatuses') },
                ...STATUSES.map((item) => ({ value: item, label: t(`cases.inquiryStatuses.${item}`) })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || status || inquiryView !== 'referred' ? t(noResultsKey) : t(emptyKey)}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="applicant" label={t('users.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('users.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="center" label={t('cases.inquiryCenter')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="job" label={t('cases.activityJob')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('cases.inquiryStatus')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="referredAt" label={t('cases.inquiryReferredAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="decidedAt" label={t('cases.inquiryDecidedAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <Link to={`${viewBase}/${item.id}`} data-row-view className="sr-only">
                    {t('common.view')}
                  </Link>
                  {item.applicantName}
                </td>
                <td className="px-4 py-3">{item.nationalId ? localizeDigits(item.nationalId, locale) : '—'}</td>
                <td className="px-4 py-3">{item.centerName}</td>
                <td className="px-4 py-3">{item.jobTitle ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass[item.status]}`}
                  >
                    {t(`cases.inquiryStatuses.${item.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <InquiryDateBadge value={item.referredAt} tone="teal" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <InquiryDateBadge value={item.decidedAt} tone="mint" />
                    <InquiryElapsedBadge
                      from={item.referredAt || item.createdAt}
                      to={item.decidedAt}
                      locale={locale}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      <PaginationBar
        page={query.data?.page ?? page}
        pageSize={query.data?.pageSize ?? 10}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  )
}
