import { HardHat } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { jobsCatalogApi, jobsCatalogPath } from '../../lib/paths/jobs'
import { JobCatalogForm } from './JobCatalogForm'

export function JobCatalogCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={HardHat}
        title={t('jobCatalog.create')}
        subtitle={t('jobCatalog.createSubtitle')}
      />
      <JobCatalogForm
        onSubmit={async (payload) => {
          await api.post(jobsCatalogApi(), payload)
          toast.success(t('jobCatalog.created'))
          navigate(jobsCatalogPath())
        }}
      />
    </div>
  )
}
