import { AlarmClock, BadgeCheck, Clock3, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FormField, PageHeader, caseShellClassName } from '../../components/ui/Form'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import { managementReviewPath } from './management-review-path'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type RequestType = 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'STEWARDSHIP' | 'AUCTION'

type ReviewRow = {
  id: string
  status: ReviewStatus
  roleId: string
  roleName: string
  displayTitle: string
  caseFileId: string
  requestId: string
  requestType: RequestType
  requestNumber: string
  fullName: string
  nationalId: string | null
  jobTitle: string | null
  unitTitle: string | null
  trackingCode: string | null
  createdAt: string
}

const statusTone: Record<ReviewStatus, string> = {
  PENDING: 'bg-white text-amber-900 ring-amber-200',
  APPROVED: 'bg-white text-emerald-800 ring-emerald-200',
  REJECTED: 'bg-white text-red-800 ring-red-200',
}

const reviewViews = ['referred', 'decided', 'reviewing', 'overdue'] as const

type ReviewView = (typeof reviewViews)[number]

function reviewViewOf(value: string): ReviewView {
  return reviewViews.includes(value as ReviewView) ? (value as ReviewView) : 'referred'
}

type ReviewStatsData = {
  referred: number
  decided: number
  reviewing: number
  overdue: number
  titles: string[]
}

function ReviewInboxStats({ active, onSelect }: { active: ReviewView; onSelect: (view: ReviewView) => void }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const stats = useQuery({
    queryKey: ['cases', 'management-reviews-stats'],
    queryFn: async () => (await api.get<ReviewStatsData>('/cases/management-reviews/stats')).data,
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
  const cards: { view: ReviewView; icon: LucideIcon; label: string; value: number; tone: 'teal' | 'mint' | 'amber' }[] = [
    { view: 'referred', icon: ShieldCheck, label: t('cases.managementReviewsStatsReferred'), value: stats.data.referred, tone: 'teal' },
    { view: 'decided', icon: BadgeCheck, label: t('cases.managementReviewsStatsDecided'), value: stats.data.decided, tone: 'mint' },
    { view: 'reviewing', icon: Clock3, label: t('cases.managementReviewsStatsReviewing'), value: stats.data.reviewing, tone: 'teal' },
    { view: 'overdue', icon: AlarmClock, label: t('cases.managementReviewsStatsOverdue'), value: stats.data.overdue, tone: 'amber' },
  ]
  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <ReviewStatCard
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

function ReviewStatCard({
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

export function CaseManagementReviewsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const headerStats = useQuery({
    queryKey: ['cases', 'management-reviews-stats'],
    queryFn: async () => (await api.get<ReviewStatsData>('/cases/management-reviews/stats')).data,
  })
  const approvalTitle = (headerStats.data?.titles ?? []).join('، ')
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams, clearParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const status = searchParams.get('status') ?? ''
  const view = reviewViewOf(searchParams.get('view') ?? '')

  const query = useQuery({
    queryKey: ['cases', 'management-reviews', q, page, status, view, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ReviewRow>>('/cases/management-reviews', {
        params: {
          q: q || undefined,
          page,
          ...(status ? { status } : {}),
          ...(view !== 'referred' ? { view } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtered = Boolean(q || status || view !== 'referred')

  function selectView(next: ReviewView) {
    setParams({ view: next === 'referred' || next === view ? undefined : next }, { resetPage: true })
  }

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={ShieldCheck}
        title={t('menus.caseManagementReviews')}
        subtitle={approvalTitle ? t('cases.managementReviewsSubtitle', { role: approvalTitle }) : undefined}
      />
      <ReviewInboxStats active={view} onSelect={selectView} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('cases.managementReviewsSearch')}
        placeholder={t('cases.managementReviewsSearchPlaceholder')}
        filtersActive={Boolean(status)}
        onClearFilters={() => clearParams(['status'])}
        extra={
          <FormField icon={BadgeCheck} label={t('cases.inquiryStatus')} htmlFor="management-review-status">
            <SearchSelect
              id="management-review-status"
              value={status}
              onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
              placeholder={t('cases.allReviewStatuses')}
              options={[
                { value: '', label: t('cases.allReviewStatuses') },
                { value: 'PENDING', label: t('cases.inquiryStatuses.PENDING') },
                { value: 'APPROVED', label: t('cases.inquiryStatuses.APPROVED') },
                { value: 'REJECTED', label: t('cases.inquiryStatuses.REJECTED') },
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={filtered ? t('cases.managementReviewsNoResults') : t('cases.managementReviewsEmpty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="applicant" label={t('users.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('users.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="job" label={t('cases.job')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="requestType" label={t('cases.requestType')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-start font-medium">{t('cases.managementReviewTitle')}</th>
              <SortableTh column="status" label={t('cases.inquiryStatus')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.fullName || '—'}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? (
                    <span dir="ltr" className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-ink-800 ring-1 ring-teal-200">
                      {localizeDigits(item.nationalId, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">{item.jobTitle || '—'}</td>
                <td className="px-4 py-3">{t(`cases.requestTypes.${item.requestType}`)}</td>
                <td className="px-4 py-3">{item.displayTitle || item.roleName}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusTone[item.status]}`}>
                    {t(`cases.inquiryStatuses.${item.status}`)}
                  </span>
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions viewTo={managementReviewPath(item)} editTo={undefined} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPageChange={setPage} />
      ) : null}
    </div>
  )
}
