import { BadgeCheck, Briefcase, Files, FolderKanban, ListOrdered } from 'lucide-react'
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
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { DateText } from '../../components/ui/DateText'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { Job, JobGroup, Paginated } from '../../types/app'
import { FORMATION_STEPS } from './formation-types'

type CaseRow = {
  id: string
  fullName: string
  nationalId: string | null
  formationStep: number
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  suspensionStartsAt: string | null
  licenseNumber: string | null
  licenseIssuedAt: string | null
  licenseExpiresAt: string | null
  job: { id: string; title: string } | null
  jobTitle: string | null
}

function CaseNationalIdBadge({ value, locale }: { value: string; locale: string }) {
  return (
    <span
      dir="ltr"
      className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-ink-800 ring-1 ring-teal-200"
    >
      {localizeDigits(value, locale)}
    </span>
  )
}

function remainingLicenseDays(expiresAt: string | null) {
  if (!expiresAt) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(expiresAt)
  if (!match) return null
  const end = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((end - today) / 86_400_000))
}

function CaseStepCell({
  step,
  locale,
  status,
  suspensionStartsAt,
  licenseNumber,
  licenseIssuedAt,
  licenseExpiresAt,
}: {
  step: number
  locale: string
  status: CaseRow['status']
  suspensionStartsAt: string | null
  licenseNumber: string | null
  licenseIssuedAt: string | null
  licenseExpiresAt: string | null
}) {
  const { t } = useTranslation()
  if (status === 'SUSPENDED') {
    return (
      <div className="flex flex-col items-center gap-1 text-xs leading-5">
        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-900 ring-1 ring-amber-200">
          {t('cases.caseStatuses.SUSPENDED')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-ink-500">{t('cases.suspendStartsAt')}:</span>
          {suspensionStartsAt ? (
            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900 ring-1 ring-amber-200">
              <DateText value={suspensionStartsAt} />
            </span>
          ) : (
            '—'
          )}
        </span>
      </div>
    )
  }
  if (licenseNumber) {
    const remaining = remainingLicenseDays(licenseExpiresAt)
    const remainingText = remaining == null ? null : formatNumber(remaining, locale)
    return (
      <div className="flex flex-col items-center gap-1 text-xs leading-5">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-ink-500">{t('cases.listIssued')}:</span>
          {licenseIssuedAt ? (
            <span className="inline-flex rounded-full bg-mint-50 px-2 py-0.5 font-medium text-teal-900 ring-1 ring-mint-200">
              <DateText value={licenseIssuedAt} />
            </span>
          ) : (
            '—'
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-ink-500">{t('cases.listExpires')}:</span>
          {licenseExpiresAt ? (
            <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-900 ring-1 ring-teal-200">
              <DateText value={licenseExpiresAt} />
            </span>
          ) : (
            '—'
          )}
        </span>
        {remainingText != null ? (
          <span
            className="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-none text-teal-900 ring-1 ring-teal-200"
            aria-label={t('cases.listDaysRemaining', { count: remainingText })}
          >
            {remainingText}
          </span>
        ) : null}
      </div>
    )
  }
  const current = FORMATION_STEPS[step] ?? FORMATION_STEPS[0]
  const onLastStep = step >= FORMATION_STEPS.length - 1
  const next = onLastStep ? null : FORMATION_STEPS[step + 1]

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 py-0.5 ps-1 pe-2.5 text-xs font-medium text-teal-900 ring-1 ring-teal-200">
        <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-teal-500 px-1 text-[10px] font-semibold text-white">
          {formatNumber(step + 1, locale)}
        </span>
        {t(`cases.steps.${current}`)}
      </span>
      {next ? (
        <span className="inline-flex rounded-full bg-mint-500 bg-[linear-gradient(to_inline-end,var(--color-mint-500),var(--color-teal-500))] px-2.5 py-0.5 text-[10px] font-medium text-white shadow-[0_4px_10px_rgba(63,214,190,0.32)]">
          {t('cases.listStepNext')}: {t(`cases.steps.${next}`)}
        </span>
      ) : null}
    </div>
  )
}

export function CaseManagementPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { confirmDelete } = useConfirmDelete()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const step = searchParams.get('step') ?? ''
  const status = searchParams.get('status') ?? ''
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
    queryKey: ['cases', 'list', q, page, step, status, jobGroupId, jobId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CaseRow>>('/cases', {
        params: {
          q: q || undefined,
          page,
          ...(step ? { step } : {}),
          ...(status ? { status } : {}),
          ...(jobGroupId ? { jobGroupId } : {}),
          ...(jobId ? { jobId } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtered = Boolean(q || step || status || jobGroupId || jobId)

  return (
    <div className={caseShellClassName}>
      <PageHeader icon={Files} title={t('menus.caseManagement')} subtitle={t('cases.managementSubtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('cases.listSearch')}
        placeholder={t('cases.listSearchPlaceholder')}
        filtersActive={Boolean(step || status || jobGroupId || jobId)}
        extra={
          <>
            <FormField icon={ListOrdered} label={t('cases.filterStep')} htmlFor="case-filter-step">
              <SearchSelect
                id="case-filter-step"
                value={step}
                onChange={(next) => setParams({ step: next || undefined }, { resetPage: true })}
                placeholder={t('cases.allSteps')}
                options={[
                  { value: '', label: t('cases.allSteps') },
                  ...FORMATION_STEPS.map((item, index) => ({
                    value: String(index),
                    label: t(`cases.steps.${item}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={BadgeCheck} label={t('cases.filterCaseStatus')} htmlFor="case-filter-status">
              <SearchSelect
                id="case-filter-status"
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
            <FormField icon={FolderKanban} label={t('cases.filterJobGroup')} htmlFor="case-filter-job-group">
              <SearchSelect
                id="case-filter-job-group"
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
            <FormField icon={Briefcase} label={t('cases.filterJob')} htmlFor="case-filter-job">
              <SearchSelect
                id="case-filter-job"
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
      <TableCard
        loading={query.isLoading}
        empty={filtered ? t('cases.listNoResults') : t('cases.listEmpty')}
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
              <SortableTh column="nationalId" label={t('users.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="job" label={t('cases.job')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="jobTitle" label={t('cases.listJobTitle')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="formationStep"
                label={t('cases.listStep')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                align="center"
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  {item.licenseNumber ? (
                    <span
                      dir="ltr"
                      className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-900 ring-1 ring-teal-200"
                    >
                      {localizeDigits(item.licenseNumber, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">{item.fullName || '—'}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? <CaseNationalIdBadge value={item.nationalId} locale={locale} /> : '—'}
                </td>
                <td className="px-4 py-3">{item.job?.title || '—'}</td>
                <td className="px-4 py-3">{item.jobTitle || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <CaseStepCell
                    step={item.formationStep}
                    locale={locale}
                    status={item.status}
                    suspensionStartsAt={item.suspensionStartsAt}
                    licenseNumber={item.licenseNumber}
                    licenseIssuedAt={item.licenseIssuedAt}
                    licenseExpiresAt={item.licenseExpiresAt}
                  />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    showView={false}
                    rowOpensView
                    viewTo={`/cases/${item.id}`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('cases.confirmDelete'),
                        successMessage: t('cases.deleted'),
                        path: `/cases/${item.id}`,
                        queryKey: ['cases', 'list'],
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
