import { HandCoins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { headingFeesReturnTo } from '../financial-headings/FinancialHeadingSections'
import { MunicipalFeeForm } from './MunicipalFeeForm'

export function MunicipalFeeCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const financialHeadingId = searchParams.get('financialHeadingId') ?? ''
  const returnTo = headingFeesReturnTo(searchParams.get('returnTo'))

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={HandCoins} title={t('municipalFees.create')} />
      <MunicipalFeeForm
        presetFinancialHeadingId={financialHeadingId || undefined}
        lockFinancialHeading={Boolean(financialHeadingId)}
        onSubmit={async ({
          title,
          financialHeadingId,
          amount,
          processTypes,
          description,
          isActive,
        }) => {
          await api.post('/municipal-fees', {
            title,
            financialHeadingId,
            amount,
            processTypes,
            description,
            isActive,
          })
          toast.success(t('municipalFees.created'))
          navigate(returnTo ?? '/base-info/municipal-fees')
        }}
      />
    </div>
  )
}
