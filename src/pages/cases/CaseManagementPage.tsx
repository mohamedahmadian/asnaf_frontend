import { BadgeCheck, Briefcase, Files, FolderKanban, Gavel, IdCard, Layers, ListOrdered, MapPinned, RefreshCw, UserRound, type LucideIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { api, getApiErrorMessage } from '../../lib/api'
import { DateText } from '../../components/ui/DateText'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { Job, JobGroup, Paginated } from '../../types/app'
import { CaseDeleteDependentsDialog } from './CaseDeleteDependentsDialog'
import type { StewardRow } from './CaseStewardsSection'
import { FORMATION_STEPS, STEWARDSHIP_STEPS } from './formation-types'

type CaseListKind = 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'AUCTION' | 'STEWARD_REQUEST' | 'STEWARD_CARD'

const CASE_KIND_STYLES: Record<CaseListKind, { row: string; edge: string; badge: string; icon: LucideIcon }> = {
  ISSUANCE: {
    row: 'bg-teal-50/80 hover:!bg-teal-50 focus:!bg-teal-50',
    edge: 'border-s-teal-500',
    badge: 'bg-white text-teal-800 ring-teal-300',
    icon: BadgeCheck,
  },
  RENEWAL: {
    row: 'bg-sky-50/80 hover:!bg-sky-50 focus:!bg-sky-50',
    edge: 'border-s-sky-500',
    badge: 'bg-white text-sky-800 ring-sky-300',
    icon: RefreshCw,
  },
  LOCATION_CHANGE: {
    row: 'bg-amber-50/80 hover:!bg-amber-50 focus:!bg-amber-50',
    edge: 'border-s-amber-500',
    badge: 'bg-white text-amber-900 ring-amber-300',
    icon: MapPinned,
  },
  AUCTION: {
    row: 'bg-rose-50/80 hover:!bg-rose-50 focus:!bg-rose-50',
    edge: 'border-s-rose-400',
    badge: 'bg-white text-rose-800 ring-rose-300',
    icon: Gavel,
  },
  STEWARD_REQUEST: {
    row: 'bg-violet-50/80 hover:!bg-violet-50 focus:!bg-violet-50',
    edge: 'border-s-violet-500',
    badge: 'bg-white text-violet-800 ring-violet-300',
    icon: UserRound,
  },
  STEWARD_CARD: {
    row: 'bg-fuchsia-50/80 hover:!bg-fuchsia-50 focus:!bg-fuchsia-50',
    edge: 'border-s-fuchsia-500',
    badge: 'bg-white text-fuchsia-800 ring-fuchsia-300',
    icon: IdCard,
  },
}

type CaseRow = {
  id: string
  kind?: 'LICENSE' | 'STEWARDSHIP'
  caseKind?: CaseListKind
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
  kind,
}: {
  step: number
  kind?: 'LICENSE' | 'STEWARDSHIP'
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
  const steps = kind === 'STEWARDSHIP' ? STEWARDSHIP_STEPS : FORMATION_STEPS
  const current = steps[step] ?? steps[0]
  const onLastStep = step >= steps.length - 1
  const next = onLastStep ? null : steps[step + 1]

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
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [dependentsDelete, setDependentsDelete] = useState<{ id: string; rows: StewardRow[] } | null>(null)
  const [removingDependents, setRemovingDependents] = useState(false)
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const step = searchParams.get('step') ?? ''
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
    queryKey: ['cases', 'list', q, page, step, status, caseKind, jobGroupId, jobId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CaseRow>>('/cases', {
        params: {
          q: q || undefined,
          page,
          ...(step ? { step } : {}),
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
  const filtered = Boolean(q || step || status || caseKind || jobGroupId || jobId)

  function confirmCaseDelete(id: string) {
    confirmDelete({
      message: t('cases.confirmDelete'),
      successMessage: t('cases.deleted'),
      path: `/cases/${id}`,
      queryKey: ['cases', 'list'],
    })
  }

  async function askDelete(id: string) {
    if (checkingId || dependentsDelete) return
    setCheckingId(id)
    try {
      const { data } = await api.get<StewardRow[]>(`/cases/${id}/stewards`)
      if (data.length) {
        setDependentsDelete({ id, rows: data })
        return
      }
      confirmCaseDelete(id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setCheckingId(null)
    }
  }

  async function confirmDependentsDelete() {
    if (!dependentsDelete || removingDependents) return
    setRemovingDependents(true)
    try {
      await api.delete(`/cases/${dependentsDelete.id}`)
      toast.success(t('cases.deleted'))
      setDependentsDelete(null)
      void queryClient.invalidateQueries({ queryKey: ['cases', 'list'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setRemovingDependents(false)
    }
  }

  return (
    <div className={caseShellClassName}>
      <PageHeader icon={Files} title={t('menus.caseManagement')} subtitle={t('cases.managementSubtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('cases.listSearch')}
        placeholder={t('cases.listSearchPlaceholder')}
        filtersActive={Boolean(step || status || caseKind || jobGroupId || jobId)}
        extra={
          <>
            <FormField icon={Layers} label={t('cases.filterCaseKind')} htmlFor="case-filter-kind">
              <SearchSelect
                id="case-filter-kind"
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
            {rows.map((item) => {
              const caseKind =
                item.caseKind && item.caseKind in CASE_KIND_STYLES
                  ? item.caseKind
                  : item.kind === 'STEWARDSHIP'
                    ? 'STEWARD_REQUEST'
                    : 'ISSUANCE'
              const kindStyle = CASE_KIND_STYLES[caseKind]
              const KindIcon = kindStyle.icon
              return (
                <tr key={item.id} className={`border-t border-line ${kindStyle.row}`}>
                <td className={`border-s-4 px-4 py-3 ${kindStyle.edge}`}>
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
                <td className="px-4 py-3">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {item.fullName || '—'}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${kindStyle.badge}`}>
                      <KindIcon className="size-3.5" aria-hidden />
                      {t(`cases.caseKinds.${caseKind}`)}
                    </span>
                  </span>
                </td>
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
                    kind={item.kind}
                  />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    showView={false}
                    rowOpensView
                    viewTo={`/cases/${item.id}`}
                    onDelete={() => void askDelete(item.id)}
                  />
                </td>
              </tr>
              )
            })}
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
      {dependentsDelete ? (
        <CaseDeleteDependentsDialog
          rows={dependentsDelete.rows}
          pending={removingDependents}
          onClose={() => {
            if (!removingDependents) setDependentsDelete(null)
          }}
          onConfirm={() => void confirmDependentsDelete()}
        />
      ) : null}
    </div>
  )
}
