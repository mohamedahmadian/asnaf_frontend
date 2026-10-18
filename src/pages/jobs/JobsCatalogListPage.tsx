import { Briefcase, FolderKanban, HardHat, Layers, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { Button, FormField, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatGroupedNumber, formatNumber } from '../../lib/datetime'
import { jobCatalogApi, jobCatalogEditPath, jobCatalogNewPath, jobCatalogPath, jobsCatalogApi } from '../../lib/paths/jobs'
import type { Job, JobGroup, JobType, Paginated } from '../../types/app'

type JobCatalogStats = {
  jobCount: number
  jobGroupCount: number
  byJobType: { id: string; title: string; count: number }[]
}

function asList<T>(data: T[] | Paginated<T>) {
  return Array.isArray(data) ? data : data.items
}

function dailyFee(annualFee: number | null | undefined) {
  if (annualFee == null || !Number.isFinite(annualFee)) return null
  return Math.round(annualFee / 365)
}

export function JobsCatalogListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams, clearParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const groupId = searchParams.get('groupId') ?? ''
  const jobTypeId = searchParams.get('jobTypeId') ?? ''
  const filtersActive = Boolean(groupId || jobTypeId)

  const groups = useQuery({
    queryKey: ['job-groups', 'lookup'],
    queryFn: async () => asList((await api.get<JobGroup[] | Paginated<JobGroup>>('/job-groups')).data),
  })
  const types = useQuery({
    queryKey: ['job-types', 'lookup'],
    queryFn: async () => asList((await api.get<JobType[] | Paginated<JobType>>('/job-types')).data),
  })
  const stats = useQuery({
    queryKey: ['jobs-catalog', 'stats'],
    queryFn: async () => (await api.get<JobCatalogStats>('/jobs/stats')).data,
  })

  const query = useQuery({
    queryKey: ['jobs-catalog', 'list', q, page, groupId, jobTypeId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Job>>(jobsCatalogApi(), {
        params: {
          q: q || undefined,
          page,
          ...(groupId ? { groupId } : {}),
          ...(jobTypeId ? { jobTypeId } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={HardHat}
        title={t('menus.jobs')}
        subtitle={t('jobCatalog.subtitle')}
        action={
          <Link to={jobCatalogNewPath()}>
            <Button>
              <Plus className="size-4" />
              {t('jobCatalog.create')}
            </Button>
          </Link>
        }
      />
      <JobCatalogStatsCards stats={stats.data} loading={stats.isLoading} locale={locale} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('jobCatalog.search')}
        placeholder={t('jobCatalog.searchPlaceholder')}
        filtersActive={filtersActive}
        onClearFilters={() => clearParams(['groupId', 'jobTypeId'])}
        extra={
          <>
            <FormField icon={FolderKanban} label={t('jobCatalog.jobGroup')} htmlFor="job-filter-group">
              <SearchSelect
                id="job-filter-group"
                value={groupId}
                onChange={(next) => setParams({ groupId: next || undefined }, { resetPage: true })}
                placeholder={t('jobCatalog.allGroups')}
                options={[
                  { value: '', label: t('jobCatalog.allGroups') },
                  ...(groups.data ?? []).map((item) => ({ value: item.id, label: item.title })),
                ]}
              />
            </FormField>
            <FormField icon={Briefcase} label={t('jobCatalog.jobType')} htmlFor="job-filter-type">
              <SearchSelect
                id="job-filter-type"
                value={jobTypeId}
                onChange={(next) => setParams({ jobTypeId: next || undefined }, { resetPage: true })}
                placeholder={t('jobCatalog.allJobTypes')}
                options={[
                  { value: '', label: t('jobCatalog.allJobTypes') },
                  ...(types.data ?? []).map((item) => ({ value: item.id, label: item.title })),
                ]}
              />
            </FormField>
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('jobCatalog.noResults') : t('jobCatalog.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('jobCatalog.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="jobType"
                label={t('jobCatalog.jobType')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="annualFee"
                label={t('jobCatalog.listAnnualFee')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="group"
                label={t('jobCatalog.jobGroup')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.title || '—'}</td>
                <td className="px-4 py-3">{item.jobType.title}</td>
                <td className="px-4 py-3">
                  {item.annualFee == null ? (
                    '—'
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {formatGroupedNumber(item.annualFee, locale)}
                      <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                        {t('jobCatalog.dailyFee')} {formatGroupedNumber(dailyFee(item.annualFee) ?? 0, locale)}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{item.group?.title ?? '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={jobCatalogPath(item.id)}
                    editTo={jobCatalogEditPath(item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('jobCatalog.confirmDelete'),
                        successMessage: t('jobCatalog.deleted'),
                        path: jobCatalogApi(item.id),
                        queryKey: ['jobs-catalog'],
                      })
                    }
                  />
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

function JobCatalogStatsCards({
  stats,
  loading,
  locale,
}: {
  stats: JobCatalogStats | undefined
  loading: boolean
  locale: string
}) {
  const { t } = useTranslation()
  if (loading && !stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" aria-hidden>
        <div className="h-[4.75rem] animate-pulse rounded-2xl bg-teal-50" />
        <div className="h-[4.75rem] animate-pulse rounded-2xl bg-mint-50" />
      </div>
    )
  }
  if (!stats) return null
  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={HardHat} label={t('jobCatalog.statsJobs')} value={stats.jobCount} locale={locale} tone="teal" />
        <StatCard
          icon={FolderKanban}
          label={t('jobCatalog.statsGroups')}
          value={stats.jobGroupCount}
          locale={locale}
          tone="mint"
        />
      </div>
      {stats.byJobType.length > 0 ? (
        <div className="rounded-3xl border border-teal-100 bg-[linear-gradient(180deg,#ffffff_0%,#f4fbfa_100%)] p-4 shadow-[0_12px_32px_rgba(46,189,182,0.08)] sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-800">
            <span className="flex size-8 items-center justify-center rounded-xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
              <Layers className="size-4" aria-hidden />
            </span>
            {t('jobCatalog.statsByType')}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {stats.byJobType.map((item, index) => (
              <StatCard
                key={item.id}
                icon={Briefcase}
                label={item.title}
                value={item.count}
                locale={locale}
                tone={index % 2 === 0 ? 'teal' : 'mint'}
                compact
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  locale,
  tone,
  compact = false,
}: {
  icon: LucideIcon
  label: string
  value: number
  locale: string
  tone: 'teal' | 'mint'
  compact?: boolean
}) {
  const wrap = {
    teal: 'border-teal-100 bg-gradient-to-b from-teal-50 to-white',
    mint: 'border-mint-100 bg-gradient-to-b from-mint-50 to-white',
  }[tone]
  const iconClass = {
    teal: 'bg-teal-500 shadow-[0_10px_18px_rgba(46,189,182,0.28)]',
    mint: 'bg-mint-500 shadow-[0_10px_18px_rgba(63,214,190,0.28)]',
  }[tone]
  return (
    <article className={`flex min-w-0 items-center gap-3 rounded-2xl border shadow-[0_8px_22px_rgba(46,189,182,0.08)] ${compact ? 'px-3 py-2.5' : 'px-4 py-3.5'} ${wrap}`}>
      <span
        className={`flex shrink-0 items-center justify-center rounded-2xl text-white ${iconClass} ${compact ? 'size-9' : 'size-11'}`}
      >
        <Icon className={compact ? 'size-4' : 'size-5'} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink-500">{label}</p>
        <p className={`font-semibold text-ink-900 ${compact ? 'mt-0.5 text-xl' : 'mt-0.5 text-2xl'}`}>
          {formatNumber(value, locale)}
        </p>
      </div>
    </article>
  )
}
