import { HandCoins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { MunicipalFeeForm } from './MunicipalFeeForm'

export function MunicipalFeeCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={HandCoins} title={t('municipalFees.create')} />
      <MunicipalFeeForm
        onSubmit={async ({ title, bankAccountId, amount, calcKind, description, isActive }) => {
          await api.post('/municipal-fees', {
            title,
            bankAccountId,
            amount,
            calcKind,
            description,
            isActive,
          })
          toast.success(t('municipalFees.created'))
          navigate('/base-info/municipal-fees')
        }}
      />
    </div>
  )
}
