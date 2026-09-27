import { Percent } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { DiscountForm } from './DiscountForm'

export function DiscountCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Percent}
        title={t('discounts.create')}
      />
      <DiscountForm
        onSubmit={async (payload) => {
          await api.post('/discounts', payload)
          toast.success(t('discounts.created'))
          navigate('/base-info/discounts')
        }}
      />
    </div>
  )
}
