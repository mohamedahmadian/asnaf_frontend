import { Briefcase } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { api } from '../../lib/api'
import type { JobType } from '../../types/app'
import { JobTypeForm } from './JobTypeForm'
import { JobTypeJobs, JobTypeSectionTabs, useJobTypeSection } from './JobTypeSections'

export function JobTypeEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { section, setSection } = useJobTypeSection()
  const query = useQuery({
    queryKey: ['job-type', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<JobType>(`/job-types/${id}`)
      return data
    },
  })

  if (!query.data || !query.isFetchedAfterMount || !id) {
    return <LoadingState />
  }

  const jobsTab = section === 'jobs'

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Briefcase}
        title={t('jobTypes.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={Briefcase} />}
      />
      <FormCard icon={Briefcase} title={query.data.title}>
        <JobTypeSectionTabs section={section} onChange={setSection} />
        {jobsTab ? (
          <JobTypeJobs jobTypeId={id} jobTypeTitle={query.data.title} annualFee={query.data.annualFee} />
        ) : (
          <JobTypeForm
            embedded
            initial={{
              title: query.data.title,
              description: query.data.description ?? '',
              annualFee: query.data.annualFee,
            }}
            onSubmit={async (payload) => {
              await api.patch(`/job-types/${id}`, payload)
              await queryClient.invalidateQueries({ queryKey: ['job-type', id] })
              await queryClient.invalidateQueries({ queryKey: ['job-types'] })
              toast.success(t('jobTypes.updated'))
              navigate('/base-info/job-types')
            }}
          />
        )}
      </FormCard>
    </div>
  )
}
