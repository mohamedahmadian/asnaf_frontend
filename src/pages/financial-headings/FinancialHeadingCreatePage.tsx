import { ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { FinancialHeadingForm } from './FinancialHeadingForm'
import { accountHeadingsReturnTo } from './account-return'

export function FinancialHeadingCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetBankAccountId = searchParams.get('bankAccountId') ?? ''
  const returnTo = accountHeadingsReturnTo(searchParams.get('returnTo'))

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('financialHeadings.create')}
        subtitle={t('financialHeadings.createSubtitle')}
      />
      <FinancialHeadingForm
        presetBankAccountId={presetBankAccountId || undefined}
        lockAccount={Boolean(presetBankAccountId && returnTo)}
        onSubmit={async (payload) => {
          await api.post('/financial-headings', payload)
          toast.success(t('financialHeadings.created'))
          navigate(returnTo ?? '/base-info/financial-headings')
        }}
      />
    </div>
  )
}
