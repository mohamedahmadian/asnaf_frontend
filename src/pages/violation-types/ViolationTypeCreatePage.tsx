import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { ViolationTypeForm } from './ViolationTypeForm'

export function ViolationTypeCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={ShieldAlert}
        title={t('violationTypes.create')}
      />
      <ViolationTypeForm
        onSubmit={async (payload) => {
          await api.post('/violation-types', payload)
          toast.success(t('violationTypes.created'))
          navigate('/inspection/violation-types')
        }}
      />
    </div>
  )
}
