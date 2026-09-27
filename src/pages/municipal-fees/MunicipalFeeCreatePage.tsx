import { HandCoins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { accountFeesReturnTo } from './account-return'
import { MunicipalFeeForm } from './MunicipalFeeForm'

export function MunicipalFeeCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetBankAccountId = searchParams.get('bankAccountId') ?? ''
  const returnTo = accountFeesReturnTo(searchParams.get('returnTo'))

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={HandCoins} title={t('municipalFees.create')} />
      <MunicipalFeeForm
        presetBankAccountId={presetBankAccountId || undefined}
        lockAccount={Boolean(presetBankAccountId && returnTo)}
        onSubmit={async ({ title, bankAccountId, amount, description, isActive }) => {
          await api.post('/municipal-fees', { title, bankAccountId, amount, description, isActive })
          toast.success(t('municipalFees.created'))
          navigate(returnTo ?? '/base-info/municipal-fees')
        }}
      />
    </div>
  )
}
