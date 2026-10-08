import { BadgeCheck, Briefcase, Files, GraduationCap, IdCard, ListOrdered, UserRound } from 'lucide-react'
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
import type { Job, Paginated } from '../../types/app'
import { EDUCATION_LEVELS, FORMATION_STEPS } from './formation-types'

type CaseRow = {
  id: string
  fullName: string
  nationalId: string | null
  phone: string | null
  formationStep: number
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

function CaseStepCell({
  step,
  locale,
  licenseNumber,
  licenseExpiresAt,
}: {
  step: number
  locale: string
  licenseNumber: string | null
  licenseExpiresAt: string | null
}) {
  const { t } = useTranslation()
  if (licenseNumber) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-900 ring-1 ring-teal-200">
          <BadgeCheck className="size-3.5" aria-hidden />
          <span dir="ltr">{localizeDigits(licenseNumber, locale)}</span>
        </span>
        {licenseExpiresAt ? (
          <span className="text-[11px] text-ink-500">
            {t('cases.licenseExpires')}: <DateText value={licenseExpiresAt} />
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
  const gender = searchParams.get('gender') ?? ''
  const residencyStatus = searchParams.get('residencyStatus') ?? ''
  const educationLevel = searchParams.get('educationLevel') ?? ''
  const jobId = searchParams.get('jobId') ?? ''
  const step = searchParams.get('step') ?? ''

  const jobs = useQuery({
    queryKey: ['jobs', 'lookup'],
    queryFn: async () => (await api.get<Job[]>('/jobs')).data,
  })

  const query = useQuery({
    queryKey: ['cases', 'list', q, page, gender, residencyStatus, educationLevel, jobId, step, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CaseRow>>('/cases', {
        params: {
          q: q || undefined,
          page,
          ...(gender ? { gender } : {}),
          ...(residencyStatus ? { residencyStatus } : {}),
          ...(educationLevel ? { educationLevel } : {}),
          ...(jobId ? { jobId } : {}),
          ...(step ? { step } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtered = Boolean(q || gender || residencyStatus || educationLevel || jobId || step)

  return (
    <div className={caseShellClassName}>
      <PageHeader icon={Files} title={t('menus.caseManagement')} subtitle={t('cases.managementSubtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('cases.listSearch')}
        placeholder={t('cases.listSearchPlaceholder')}
        filtersActive={Boolean(gender || residencyStatus || educationLevel || jobId || step)}
        extra={
          <>
            <FormField icon={UserRound} label={t('cases.filterGender')} htmlFor="case-filter-gender">
              <SearchSelect
                id="case-filter-gender"
                value={gender}
                onChange={(next) => setParams({ gender: next || undefined }, { resetPage: true })}
                placeholder={t('cases.allGenders')}
                options={[
                  { value: '', label: t('cases.allGenders') },
                  { value: 'MALE', label: t('userGenders.MALE') },
                  { value: 'FEMALE', label: t('userGenders.FEMALE') },
                ]}
              />
            </FormField>
            <FormField icon={IdCard} label={t('cases.filterResidency')} htmlFor="case-filter-residency">
              <SearchSelect
                id="case-filter-residency"
                value={residencyStatus}
                onChange={(next) => setParams({ residencyStatus: next || undefined }, { resetPage: true })}
                placeholder={t('cases.allResidencies')}
                options={[
                  { value: '', label: t('cases.allResidencies') },
                  { value: 'RESIDENT', label: t('cases.resident') },
                  { value: 'NON_RESIDENT', label: t('cases.nonResident') },
                ]}
              />
            </FormField>
            <FormField icon={GraduationCap} label={t('cases.filterEducation')} htmlFor="case-filter-education">
              <SearchSelect
                id="case-filter-education"
                value={educationLevel}
                onChange={(next) => setParams({ educationLevel: next || undefined }, { resetPage: true })}
                placeholder={t('cases.allEducations')}
                options={[
                  { value: '', label: t('cases.allEducations') },
                  ...EDUCATION_LEVELS.map((item) => ({
                    value: item,
                    label: t(`cases.educationLevels.${item}`),
                  })),
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
                  ...(jobs.data ?? [])
                    .filter((item) => item.isActive)
                    .map((item) => ({ value: item.id, label: item.title })),
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
              <SortableTh column="fullName" label={t('users.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('users.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('users.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
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
                <td className="px-4 py-3">{item.fullName || '—'}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? <CaseNationalIdBadge value={item.nationalId} locale={locale} /> : '—'}
                </td>
                <td className="px-4 py-3">{item.phone ? localizeDigits(item.phone, locale) : '—'}</td>
                <td className="px-4 py-3">{item.job?.title || '—'}</td>
                <td className="px-4 py-3">{item.jobTitle || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <CaseStepCell
                    step={item.formationStep}
                    locale={locale}
                    licenseNumber={item.licenseNumber}
                    licenseExpiresAt={item.licenseExpiresAt}
                  />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
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
