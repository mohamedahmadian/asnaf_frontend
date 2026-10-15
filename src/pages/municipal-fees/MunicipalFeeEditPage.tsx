import { HandCoins } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { MunicipalFee } from '../../types/app'
import { headingFeesReturnTo } from '../financial-headings/FinancialHeadingSections'
import { MunicipalFeeForm } from './MunicipalFeeForm'

export function MunicipalFeeEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const returnTo = headingFeesReturnTo(searchParams.get('returnTo'))
  const query = useQuery({
    queryKey: ['municipal-fee', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<MunicipalFee>(`/municipal-fees/${id}`)
      return data
    },
  })

  if (!query.data || !query.isFetchedAfterMount) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={HandCoins}
        title={t('municipalFees.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={HandCoins} />}
      />
      <MunicipalFeeForm
        lockFinancialHeading={Boolean(returnTo)}
        initial={{
          title: query.data.title,
          financialHeadingId: query.data.financialHeadingId,
          amount: query.data.amount,
          processTypes: query.data.processTypes,
          description: query.data.description ?? '',
          isActive: query.data.isActive,
          financialHeading: query.data.financialHeading,
        }}
        onSubmit={async ({
          title,
          financialHeadingId,
          amount,
          processTypes,
          description,
          isActive,
        }) => {
          await api.patch(`/municipal-fees/${id}`, {
            title,
            financialHeadingId,
            amount,
            processTypes,
            description,
            isActive,
          })
          await queryClient.invalidateQueries({ queryKey: ['municipal-fee', id] })
          await queryClient.invalidateQueries({ queryKey: ['municipal-fees'] })
          toast.success(t('municipalFees.updated'))
          navigate(returnTo ?? '/base-info/municipal-fees')
        }}
      />
    </div>
  )
}
