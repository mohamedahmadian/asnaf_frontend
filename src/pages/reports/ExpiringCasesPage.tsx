import { BadgeCheck, Briefcase, CalendarClock, FolderKanban, Hourglass, Layers } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, FormField, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import {
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
} from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { Job, JobGroup, Paginated } from '../../types/app'

const RANGES = ['this-week', 'two-weeks', 'three-weeks', 'this-month'] as const
type ExpiringRange = (typeof RANGES)[number]

type ExpiringRow = {
  id: string
  kind: 'LICENSE' | 'STEWARDSHIP'
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  licenseNumber: string | null
  fullName: string
  nationalId: string | null
  job: { id: string; title: string } | null
  jobTitle: string | null
  expiresAt: string | null
  daysRemaining: number
}

function isRange(value: string): value is ExpiringRange {
  return (RANGES as readonly string[]).includes(value)
}

function daysTone(days: number) {
  if (days <= 7) return 'bg-rose-50 text-rose-800 ring-rose-200'
  if (days <= 14) return 'bg-amber-50 text-amber-900 ring-amber-200'
  return 'bg-mint-50 text-teal-900 ring-mint-200'
}

export function ExpiringCasesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams, clearParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const rangeParam = searchParams.get('range') ?? ''
  const range: ExpiringRange = isRange(rangeParam) ? rangeParam : 'this-week'
  const status = searchParams.get('status') ?? ''
  const caseKind = searchParams.get('caseKind') ?? ''
  const jobGroupId = searchParams.get('jobGroupId') ?? ''
  const jobId = searchParams.get('jobId') ?? ''

  const jobs = useQuery({
    queryKey: ['jobs', 'lookup'],
    queryFn: async () => (await api.get<Job[]>('/jobs')).data,
  })
  const jobGroups = useQuery({
    queryKey: ['job-groups', 'lookup'],
    queryFn: async () => (await api.get<JobGroup[]>('/job-groups')).data,
  })
  const jobOptions = (jobs.data ?? []).filter(
    (item) => item.isActive && (!jobGroupId || item.groupId === jobGroupId),
  )

  const query = useQuery({
    queryKey: ['cases', 'expiring', q, page, range, status, caseKind, jobGroupId, jobId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ExpiringRow>>('/cases/reports/expiring', {
        params: {
          q: q || undefined,
          page,
          range,
          ...(status ? { status } : {}),
          ...(caseKind ? { caseKind } : {}),
          ...(jobGroupId ? { jobGroupId } : {}),
          ...(jobId ? { jobId } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtered = Boolean(q || status || caseKind || jobGroupId || jobId)
  const total = query.data?.total

  return (
    <div className={caseShellClassName}>
      <PageHeader icon={CalendarClock} title={t('menus.expiringCases')} subtitle={t('cases.expiring.subtitle')} />
      <article className="mb-4 flex w-fit items-center gap-3 rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50 to-white px-4 py-3.5 text-teal-600">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_10px_18px_rgba(46,189,182,0.28)]">
          <Hourglass className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">{t('cases.expiring.statLabel')}</p>
          <p className="mt-0.5 text-2xl font-semibold text-ink-900">
            {total == null ? '—' : formatNumber(total, locale)}
          </p>
        </div>
      </article>
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('cases.expiring.search')}
        placeholder={t('cases.expiring.searchPlaceholder')}
        filtersActive={Boolean(status || caseKind || jobGroupId || jobId)}
        onClearFilters={() => clearParams(['status', 'caseKind', 'jobGroupId', 'jobId'])}
        extra={
          <>
            <FormField icon={Layers} label={t('cases.filterCaseKind')} htmlFor="expiring-filter-kind">
              <SearchSelect
                id="expiring-filter-kind"
                value={caseKind}
                onChange={(next) => setParams({ caseKind: next || undefined }, { resetPage: true })}
                placeholder={t('cases.allCaseKinds')}
                options={[
                  { value: '', label: t('cases.allCaseKinds') },
                  { value: 'ISSUANCE', label: t('cases.caseKinds.ISSUANCE') },
                  { value: 'RENEWAL', label: t('cases.caseKinds.RENEWAL') },
                  { value: 'LOCATION_CHANGE', label: t('cases.caseKinds.LOCATION_CHANGE') },
                  { value: 'AUCTION', label: t('cases.caseKinds.AUCTION') },
                  { value: 'STEWARD_REQUEST', label: t('cases.caseKinds.STEWARD_REQUEST') },
                  { value: 'STEWARD_CARD', label: t('cases.caseKinds.STEWARD_CARD') },
                ]}
              />
            </FormField>
            <FormField icon={BadgeCheck} label={t('cases.filterCaseStatus')} htmlFor="expiring-filter-status">
              <SearchSelect
                id="expiring-filter-status"
                value={status}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                placeholder={t('cases.allCaseStatuses')}
                options={[
                  { value: '', label: t('cases.allCaseStatuses') },
                  { value: 'ACTIVE', label: t('cases.caseStatuses.ACTIVE') },
                  { value: 'SUSPENDED', label: t('cases.caseStatuses.SUSPENDED') },
                  { value: 'REVOKED', label: t('cases.caseStatuses.REVOKED') },
                ]}
              />
            </FormField>
            <FormField icon={FolderKanban} label={t('cases.filterJobGroup')} htmlFor="expiring-filter-job-group">
              <SearchSelect
                id="expiring-filter-job-group"
                value={jobGroupId}
                onChange={(next) => {
                  const jobStillValid =
                    !jobId || (jobs.data ?? []).some((item) => item.id === jobId && (!next || item.groupId === next))
                  setParams(
                    {
                      jobGroupId: next || undefined,
                      ...(jobStillValid ? {} : { jobId: undefined }),
                    },
                    { resetPage: true },
                  )
                }}
                placeholder={t('cases.allJobGroups')}
                options={[
                  { value: '', label: t('cases.allJobGroups') },
                  ...(jobGroups.data ?? [])
                    .filter((item) => item.isActive)
                    .map((item) => ({ value: item.id, label: item.title })),
                ]}
              />
            </FormField>
            <FormField icon={Briefcase} label={t('cases.filterJob')} htmlFor="expiring-filter-job">
              <SearchSelect
                id="expiring-filter-job"
                value={jobId}
                onChange={(next) => setParams({ jobId: next || undefined }, { resetPage: true })}
                placeholder={t('cases.allJobs')}
                options={[
                  { value: '', label: t('cases.allJobs') },
                  ...jobOptions.map((item) => ({ value: item.id, label: item.title })),
                ]}
              />
            </FormField>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t('cases.expiring.rangeLabel')}>
        {RANGES.map((item) => (
          <Button
            key={item}
            type="button"
            variant={range === item ? 'primary' : 'ghost'}
            aria-pressed={range === item}
            onClick={() => setParams({ range: item }, { resetPage: true })}
          >
            {t(`cases.expiring.ranges.${item}`)}
          </Button>
        ))}
      </div>
      <TableCard
        loading={query.isLoading}
        empty={filtered ? t('cases.expiring.noResults') : t('cases.expiring.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="licenseNumber"
                label={t('cases.listLicenseNumber')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh column="fullName" label={t('users.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="nationalId"
                label={t('users.nationalId')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh column="job" label={t('cases.job')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="jobTitle"
                label={t('cases.listJobTitle')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="expiresAt"
                label={t('cases.listExpires')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="daysRemaining"
                label={t('cases.expiring.daysRemaining')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  {item.licenseNumber ? (
                    <span
                      dir="ltr"
                      className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-teal-900 ring-1 ring-teal-200"
                    >
                      {localizeDigits(item.licenseNumber, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">{item.fullName || '—'}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? (
                    <span
                      dir="ltr"
                      className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-ink-800 ring-1 ring-teal-200"
                    >
                      {localizeDigits(item.nationalId, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">{item.job?.title || '—'}</td>
                <td className="px-4 py-3">{item.jobTitle || '—'}</td>
                <td className="px-4 py-3">{item.expiresAt ? <DateText value={item.expiresAt} /> : '—'}</td>
                <td className="px-4 py-3">
                  <Link to={`/cases/${item.id}`} data-row-view className="sr-only">
                    {t('common.view')}
                  </Link>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${daysTone(item.daysRemaining)}`}
                  >
                    {t('cases.expiring.daysValue', {
                      count: formatNumber(item.daysRemaining, locale),
                    })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}
