import { Briefcase } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { jobApi, jobsPath } from '../../lib/paths/job-groups'
import type { Job } from '../../types/app'
import { JobForm } from './JobForm'

export function JobEditPage() {
  const { t } = useTranslation()
  const { groupId = '', jobId = '' } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['job', groupId, jobId],
    enabled: Boolean(groupId && jobId),
    queryFn: async () => {
      const { data } = await api.get<Job>(jobApi(groupId, jobId))
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Briefcase}
        title={t('jobs.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title || query.data.titleEn || ''} icon={Briefcase} />}
      />
      <JobForm
        initial={{
          title: query.data.title ?? '',
          jobTypeId: query.data.jobTypeId,
          description: query.data.description ?? '',
          code: query.data.code,
          taxIntaCode: query.data.taxIntaCode ?? '',
          inquiryCenterIds: query.data.inquiryCenters.map((center) => center.id),
          inquiryCenters: query.data.inquiryCenters,
          isActive: query.data.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(jobApi(groupId, jobId), payload)
          toast.success(t('jobs.updated'))
          navigate(jobsPath(groupId))
        }}
      />
    </div>
  )
}
