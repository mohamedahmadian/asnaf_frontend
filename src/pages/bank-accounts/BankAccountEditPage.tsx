import { Landmark } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  baseInfoFormShellClassName,
} from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { BankAccount } from '../../types/app'
import { BankAccountForm } from './BankAccountForm'

export function BankAccountEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['bank-account', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<BankAccount>(`/bank-accounts/${id}`)
      return data
    },
  })

  if (!query.data || !query.isFetchedAfterMount) {
    return <LoadingState />
  }

  const account = query.data

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Landmark}
        title={t('bankAccounts.edit')}
        subtitle={<EntityNameSubtitle name={account.bankName} icon={Landmark} />}
      />
      <BankAccountForm
        initial={{
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          cardNumber: account.cardNumber ?? '',
          iban: account.iban ?? '',
          paymentId: account.paymentId ?? '',
          description: account.description ?? '',
          isActive: account.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/bank-accounts/${id}`, payload)
          await queryClient.invalidateQueries({ queryKey: ['bank-account', id] })
          await queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
          toast.success(t('bankAccounts.updated'))
          navigate('/base-info/bank-accounts')
        }}
      />
    </div>
  )
}
