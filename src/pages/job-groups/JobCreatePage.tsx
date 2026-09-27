import { Briefcase } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { jobsApi, jobsPath } from '../../lib/paths/job-groups'
import { JobForm } from './JobForm'

export function JobCreatePage() {
  const { t } = useTranslation()
  const { groupId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={Briefcase} title={t('jobs.create')} />
      <JobForm
        onSubmit={async (payload) => {
          await api.post(jobsApi(groupId), payload)
          toast.success(t('jobs.created'))
          navigate(jobsPath(groupId))
        }}
      />
    </div>
  )
}
