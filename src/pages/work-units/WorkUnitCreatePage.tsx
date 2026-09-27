import { Network } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { WorkUnitForm } from './WorkUnitForm'

export function WorkUnitCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Network}
        title={t('workUnits.create')}
      />
      <WorkUnitForm
        onSubmit={async (payload) => {
          await api.post('/work-units', payload)
          toast.success(t('workUnits.created'))
          navigate('/base-info/work-units')
        }}
      />
    </div>
  )
}
