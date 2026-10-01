import { Briefcase, Files, GraduationCap, IdCard, ListOrdered, UserRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FormField, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { PaginationBar, SearchBar, SortableTh, TableCard } from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import type { Job, Paginated, UserGender } from '../../types/app'
import { EDUCATION_LEVELS, FORMATION_STEPS, type EducationLevel } from './formation-types'

type CaseRow = {
  id: string
  fullName: string
  fatherName: string | null
  nationalId: string | null
  gender: UserGender | null
  phone: string | null
  residencyStatus: 'RESIDENT' | 'NON_RESIDENT' | null
  educationLevel: EducationLevel | null
  formationStep: number
  job: { id: string; title: string } | null
}

function stepLabel(step: number) {
  return FORMATION_STEPS[step] ?? FORMATION_STEPS[0]
}

export function CaseManagementPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
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
              <SortableTh column="fatherName" label={t('cases.fatherName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('users.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="gender" label={t('users.gender')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('users.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="residencyStatus"
                label={t('cases.residency')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh column="job" label={t('cases.job')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="educationLevel"
                label={t('cases.education')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="formationStep"
                label={t('cases.listStep')}
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
                  {item.nationalId ? (
                    <Link
                      to={`/cases/formation?nationalId=${encodeURIComponent(item.nationalId)}`}
                      data-row-view
                      className="sr-only"
                    >
                      {item.fullName}
                    </Link>
                  ) : null}
                  {item.fullName || '—'}
                </td>
                <td className="px-4 py-3">{item.fatherName || '—'}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? localizeDigits(item.nationalId, locale) : '—'}
                </td>
                <td className="px-4 py-3">{item.gender ? t(`userGenders.${item.gender}`) : '—'}</td>
                <td className="px-4 py-3">{item.phone ? localizeDigits(item.phone, locale) : '—'}</td>
                <td className="px-4 py-3">
                  {item.residencyStatus === 'RESIDENT'
                    ? t('cases.resident')
                    : item.residencyStatus === 'NON_RESIDENT'
                      ? t('cases.nonResident')
                      : '—'}
                </td>
                <td className="px-4 py-3">{item.job?.title || '—'}</td>
                <td className="px-4 py-3">
                  {item.educationLevel ? t(`cases.educationLevels.${item.educationLevel}`) : '—'}
                </td>
                <td className="px-4 py-3">{t(`cases.steps.${stepLabel(item.formationStep)}`)}</td>
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
