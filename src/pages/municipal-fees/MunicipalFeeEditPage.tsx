import { HandCoins } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { MunicipalFee } from '../../types/app'
import { MunicipalFeeForm } from './MunicipalFeeForm'

export function MunicipalFeeEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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
        initial={{
          title: query.data.title,
          bankAccountId: query.data.bankAccountId,
          amount: query.data.amount,
          calcKind: query.data.calcKind,
          description: query.data.description ?? '',
          isActive: query.data.isActive,
          bankAccount: query.data.bankAccount,
        }}
        onSubmit={async ({ title, bankAccountId, amount, calcKind, description, isActive }) => {
          await api.patch(`/municipal-fees/${id}`, {
            title,
            bankAccountId,
            amount,
            calcKind,
            description,
            isActive,
          })
          await queryClient.invalidateQueries({ queryKey: ['municipal-fee', id] })
          await queryClient.invalidateQueries({ queryKey: ['municipal-fees'] })
          toast.success(t('municipalFees.updated'))
          navigate('/base-info/municipal-fees')
        }}
      />
    </div>
  )
}
