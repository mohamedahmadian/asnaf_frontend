import { HardHat } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { jobCatalogApi, jobsCatalogPath } from '../../lib/paths/jobs'
import type { Job } from '../../types/app'
import { JobCatalogForm } from './JobCatalogForm'

export function JobCatalogEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['jobs-catalog', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Job>(jobCatalogApi(id!))
      return data
    },
  })

  if (!query.data || !query.isFetchedAfterMount) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={HardHat}
        title={t('jobCatalog.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title || query.data.titleEn || ''} icon={HardHat} />}
      />
      <JobCatalogForm
        jobId={id}
        initial={{
          title: query.data.title,
          titleEn: query.data.titleEn,
          taxIntaCode: query.data.taxIntaCode ?? '',
          jobTypeId: query.data.jobTypeId,
          annualFee: query.data.annualFee,
          groupId: query.data.groupId ?? '',
          isActive: query.data.isActive,
          documents: query.data.documents ?? [],
        }}
        onSubmit={async (payload) => {
          await api.patch(jobCatalogApi(id!), payload)
          await queryClient.invalidateQueries({ queryKey: ['jobs-catalog'] })
          await queryClient.invalidateQueries({ queryKey: ['jobs', 'lookup'] })
          toast.success(t('jobCatalog.updated'))
          navigate(jobsCatalogPath())
        }}
      />
    </div>
  )
}
