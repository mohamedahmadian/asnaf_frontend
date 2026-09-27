import { Banknote, Briefcase, CalendarDays, FileText, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  baseInfoFormShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import { formatGroupedNumber } from '../../lib/datetime'
import type { JobType } from '../../types/app'
import { JobTypeJobs, JobTypeSectionTabs, useJobTypeSection } from './JobTypeSections'

function formatFee(value: number | null | undefined, locale: string) {
  if (value == null || !Number.isFinite(value)) return '—'
  return formatGroupedNumber(value, locale)
}

function dailyFee(annualFee: number | null | undefined) {
  if (annualFee == null || !Number.isFinite(annualFee)) return null
  return Math.round(annualFee / 365)
}

export function JobTypeDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { section, setSection } = useJobTypeSection()
  const query = useQuery({
    queryKey: ['job-type', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<JobType>(`/job-types/${id}`)
      return data
    },
  })

  const item = query.data
  if (!item) {
    return <LoadingState />
  }

  const jobsTab = section === 'jobs'

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Briefcase}
        title={t('jobTypes.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={Briefcase} />}
      />
      <FormCard icon={Briefcase} title={item.title}>
        <JobTypeSectionTabs section={section} onChange={setSection} />
        {jobsTab ? (
          <JobTypeJobs jobTypeId={item.id} jobTypeTitle={item.title} annualFee={item.annualFee} />
        ) : null}
        <div
          role="tabpanel"
          id="form-panel-info"
          aria-labelledby="form-tab-info"
          hidden={jobsTab}
          className={jobsTab ? 'hidden' : 'space-y-6 p-5 sm:p-6'}
        >
          <FormSectionTitle icon={Briefcase}>{t('jobTypes.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Type}
              label={t('jobTypes.title')}
              value={item.title}
              tone="teal"
            />
            <FormFactTile
              icon={Banknote}
              label={t('jobTypes.annualFee')}
              value={formatFee(item.annualFee, locale)}
              empty={item.annualFee == null}
              tone="mint"
            />
            <FormFactTile
              icon={CalendarDays}
              label={t('jobTypes.dailyFee')}
              value={formatFee(dailyFee(item.annualFee), locale)}
              empty={item.annualFee == null}
              tone="teal"
            />
            <FormFactTile
              icon={FileText}
              label={t('jobTypes.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={
              jobsTab
                ? `/base-info/job-types/${item.id}/edit?section=jobs`
                : `/base-info/job-types/${item.id}/edit`
            }
            editLabel={t('common.edit')}
            deleteLabel={t('jobTypes.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('jobTypes.confirmDelete'),
                successMessage: t('jobTypes.deleted'),
                path: `/job-types/${item.id}`,
                queryKey: ['job-types'],
                onDeleted: () => navigate('/base-info/job-types'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
