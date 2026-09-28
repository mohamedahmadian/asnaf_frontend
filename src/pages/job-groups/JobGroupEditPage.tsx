import { FolderKanban } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { api } from '../../lib/api'
import { jobGroupApi, jobGroupsPath } from '../../lib/paths/job-groups'
import type { JobGroup } from '../../types/app'
import { JobGroupForm } from './JobGroupForm'
import { JobGroupJobs, JobGroupRepresentatives, JobGroupSectionTabs, useJobGroupSection } from './JobGroupSections'

export function JobGroupEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { section, setSection } = useJobGroupSection()
  const query = useQuery({
    queryKey: ['job-group', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<JobGroup>(jobGroupApi(id!))
      return data
    },
  })

  if (!query.data || !id) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('jobGroups.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={FolderKanban} />}
      />
      <FormCard icon={FolderKanban} title={query.data.title}>
        <JobGroupSectionTabs section={section} onChange={setSection} />
        {section === 'representatives' ? <JobGroupRepresentatives jobGroupId={id} manage /> : null}
        {section === 'jobs' ? <JobGroupJobs jobGroupId={id} manage /> : null}
        {section === 'info' ? (
          <JobGroupForm
            embedded
            initial={{
              title: query.data.title,
              titleEn: query.data.titleEn,
              description: query.data.description ?? '',
              code: query.data.code,
              isActive: query.data.isActive,
            }}
            onSubmit={async (payload) => {
              await api.patch(jobGroupApi(id), payload)
              toast.success(t('jobGroups.updated'))
              navigate(jobGroupsPath())
            }}
          />
        ) : null}
      </FormCard>
    </div>
  )
}
