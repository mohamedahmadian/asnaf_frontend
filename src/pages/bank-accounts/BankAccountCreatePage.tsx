import { Landmark } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { BankAccountForm } from './BankAccountForm'

export function BankAccountCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Landmark}
        title={t('bankAccounts.create')}
      />
      <BankAccountForm
        onSubmit={async (payload) => {
          await api.post('/bank-accounts', payload)
          toast.success(t('bankAccounts.created'))
          navigate('/base-info/bank-accounts')
        }}
      />
    </div>
  )
}
