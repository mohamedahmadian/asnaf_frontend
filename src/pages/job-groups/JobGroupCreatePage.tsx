import { FolderKanban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { jobGroupsApi, jobGroupsPath } from '../../lib/paths/job-groups'
import { JobGroupForm } from './JobGroupForm'

export function JobGroupCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('jobGroups.create')}
      />
      <JobGroupForm
        onSubmit={async (payload) => {
          await api.post(jobGroupsApi(), payload)
          toast.success(t('jobGroups.created'))
          navigate(jobGroupsPath())
        }}
      />
    </div>
  )
}
