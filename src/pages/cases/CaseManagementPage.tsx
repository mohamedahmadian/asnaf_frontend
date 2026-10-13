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

const CASE_KIND_STYLES: Record<CaseListKind, { badge: string; icon: LucideIcon }> = {
  ISSUANCE: {
    badge: 'bg-white text-teal-800 ring-teal-300',
    icon: BadgeCheck,
  },
  RENEWAL: {
    badge: 'bg-white text-sky-800 ring-sky-300',
    icon: RefreshCw,
  },
  LOCATION_CHANGE: {
    badge: 'bg-white text-amber-900 ring-amber-300',
    icon: MapPinned,
  },
  AUCTION: {
    badge: 'bg-white text-rose-800 ring-rose-300',
    icon: Gavel,
  },
  STEWARD_REQUEST: {
    badge: 'bg-white text-violet-800 ring-violet-300',
    icon: UserRound,
  },
  STEWARD_CARD: {
    badge: 'bg-white text-fuchsia-800 ring-fuchsia-300',
    icon: IdCard,
  },
}

const CASE_STATUS_STYLES: Record<CaseRow['status'], { row: string; edge: string }> = {
  ACTIVE: {
    row: 'bg-teal-50/80 hover:!bg-teal-50 focus:!bg-teal-50',
    edge: 'border-s-teal-500',
  },
  SUSPENDED: {
    row: 'bg-amber-50/80 hover:!bg-amber-50 focus:!bg-amber-50',
    edge: 'border-s-amber-500',
  },
  REVOKED: {
    row: 'bg-rose-50/80 hover:!bg-rose-50 focus:!bg-rose-50',
    edge: 'border-s-rose-400',
  },
}

const NAME_REQUEST_LIMIT = 4

type CaseRequestBadge = {
  type: 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'STEWARDSHIP' | 'AUCTION'
  status: 'OPEN' | 'ISSUED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
}

function requestBadgeKind(request: CaseRequestBadge): CaseListKind {
  if (request.type === 'STEWARDSHIP') {
    return request.status === 'ISSUED' || request.status === 'COMPLETED' ? 'STEWARD_CARD' : 'STEWARD_REQUEST'
  }
  return request.type
}

type CaseRow = {
  id: string
  kind?: 'LICENSE' | 'STEWARDSHIP'
  caseKind?: CaseListKind
  requests?: CaseRequestBadge[]
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

function NameRequestCell({
  item,
  caseKind,
  locale,
}: {
  item: CaseRow
  caseKind: CaseListKind
  locale: string
}) {
  const { t } = useTranslation()
  const kinds =
    item.requests && item.requests.length > 0 ? item.requests.map(requestBadgeKind) : [caseKind]
  const visible = kinds.slice(0, NAME_REQUEST_LIMIT)
  const extra = kinds.length - visible.length
  const firstRow = visible.slice(0, 2)
  const lastRow = visible.slice(2)
  const badge = (kind: CaseListKind, index: number) => {
    const style = CASE_KIND_STYLES[kind]
    const Icon = style.icon
    return (
      <span
        key={`${kind}-${index}`}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${style.badge}`}
      >
        <Icon className="size-3.5" aria-hidden />
        {t(`cases.caseKinds.${kind}`)}
      </span>
    )
  }
  const more =
    extra > 0 ? (
      <span
        className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200"
        title={t('cases.moreRequests')}
        aria-label={t('cases.moreRequests')}
      >
        +{formatNumber(extra, locale)}
      </span>
    ) : null
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span>{item.fullName || '—'}</span>
      <span className="inline-flex flex-col items-start gap-1">
        <span className="inline-grid grid-cols-2 gap-1">{firstRow.map(badge)}</span>
        {lastRow.length > 0 ? (
          <span className={extra > 0 ? 'inline-flex items-center gap-1' : 'inline-grid grid-cols-2 gap-1'}>
            {lastRow.map((kind, index) => badge(kind, index + firstRow.length))}
            {more}
          </span>
        ) : null}
      </span>
    </div>
  )
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

function CaseStepCell({
  step,
  locale,
  status,
  licenseNumber,
  licenseIssuedAt,
  licenseExpiresAt,
  kind,
}: {
  step: number
  kind?: 'LICENSE' | 'STEWARDSHIP'
  locale: string
  status: CaseRow['status']
  licenseNumber: string | null
  licenseIssuedAt: string | null
  licenseExpiresAt: string | null
}) {
  const { t } = useTranslation()
  const hasLicense = Boolean(licenseNumber || licenseIssuedAt || licenseExpiresAt)
  if (hasLicense || status === 'SUSPENDED' || status === 'REVOKED') {
    const statusTone =
      status === 'REVOKED'
        ? 'bg-rose-50 text-rose-800 ring-rose-200'
        : status === 'SUSPENDED'
          ? 'bg-amber-50 text-amber-900 ring-amber-200'
          : 'bg-mint-50 text-teal-900 ring-mint-200'
    return (
      <div className="flex flex-col items-center gap-1 text-xs leading-5">
        {hasLicense ? (
          <span dir="ltr" className="inline-flex items-center justify-center gap-1.5">
            <span className="inline-flex rounded-full bg-mint-50 px-2 py-0.5 font-medium text-teal-900 ring-1 ring-mint-200">
              {licenseIssuedAt ? <DateText value={licenseIssuedAt} /> : '—'}
            </span>
            <span className="text-ink-400" aria-hidden>
              -
            </span>
            <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-900 ring-1 ring-teal-200">
              {licenseExpiresAt ? <DateText value={licenseExpiresAt} /> : '—'}
            </span>
          </span>
        ) : null}
        <span className={`inline-flex rounded-full px-2.5 py-0.5 font-medium ring-1 ${statusTone}`}>
          {t(`cases.caseStatuses.${status}`)}
        </span>
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
              const statusStyle = CASE_STATUS_STYLES[item.status]
              return (
                <tr key={item.id} className={`border-t border-line ${statusStyle.row}`}>
                <td className={`border-s-4 px-4 py-3 ${statusStyle.edge}`}>
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
                  <NameRequestCell item={item} caseKind={caseKind} locale={locale} />
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
