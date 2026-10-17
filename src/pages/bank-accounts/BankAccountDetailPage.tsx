import { CreditCard, FileText, Hash, Landmark, Receipt, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  baseInfoFormShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import type { BankAccount } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'

export function BankAccountDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['bank-account', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<BankAccount>(`/bank-accounts/${id}`)
      return data
    },
  })

  const account = query.data
  if (!account) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Landmark}
        title={t('bankAccounts.details')}
        subtitle={<EntityNameSubtitle name={account.bankName} icon={Landmark} />}
      />
      <FormCard icon={Landmark} title={account.bankName}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Landmark}>{t('bankAccounts.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Landmark}
              label={t('bankAccounts.bankName')}
              value={account.bankName}
              tone="teal"
            />
            <FormFactTile
              icon={Hash}
              label={t('bankAccounts.accountNumber')}
              copyValue={account.accountNumber}
              tone="mint"
            />
            <FormFactTile
              icon={CreditCard}
              label={t('bankAccounts.cardNumber')}
              copyValue={account.cardNumber}
            />
            <FormFactTile icon={Wallet} label={t('bankAccounts.iban')} copyValue={account.iban} />
            <FormFactTile
              icon={Receipt}
              label={t('bankAccounts.paymentId')}
              copyValue={account.paymentId}
              tone="teal"
            />
            <FormFactTile
              icon={Landmark}
              label={t('bankAccounts.isActive')}
              value={<GeoStatus active={account.isActive} />}
            />
            <FormFactTile
              icon={FileText}
              label={t('bankAccounts.description')}
              value={account.description || '—'}
              empty={!account.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`/base-info/bank-accounts/${account.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('bankAccounts.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('bankAccounts.confirmDelete'),
                successMessage: t('bankAccounts.deleted'),
                path: `/bank-accounts/${account.id}`,
                queryKey: ['bank-accounts'],
                onDeleted: () => navigate('/base-info/bank-accounts'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
