import { Briefcase } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { JobTypeForm } from './JobTypeForm'

export function JobTypeCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Briefcase}
        title={t('jobTypes.create')}
      />
      <JobTypeForm
        onSubmit={async (payload) => {
          await api.post('/job-types', payload)
          toast.success(t('jobTypes.created'))
          navigate('/base-info/job-types')
        }}
      />
    </div>
  )
}
