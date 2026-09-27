import { ScanSearch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { InquiryCenterForm } from './InquiryCenterForm'

export function InquiryCenterCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={ScanSearch}
        title={t('inquiryCenters.create')}
      />
      <InquiryCenterForm
        onSubmit={async (payload) => {
          await api.post('/inquiry-centers', payload)
          toast.success(t('inquiryCenters.created'))
          navigate('/base-info/inquiry-centers')
        }}
      />
    </div>
  )
}
