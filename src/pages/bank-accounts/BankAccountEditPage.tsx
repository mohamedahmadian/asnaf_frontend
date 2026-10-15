import { Landmark, Plus } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Button,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  baseInfoFormShellClassName,
} from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { api } from '../../lib/api'
import type { BankAccount } from '../../types/app'
import { BankAccountForm } from './BankAccountForm'
import {
  AccountFinancialHeadings,
  BankAccountSectionTabs,
  addFinancialHeadingPath,
  useBankAccountSection,
} from './BankAccountSections'

export function BankAccountEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { section, setSection } = useBankAccountSection()
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

  const headingsTab = section === 'headings'
  const account = query.data

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Landmark}
        title={t('bankAccounts.edit')}
        subtitle={<EntityNameSubtitle name={account.bankName} icon={Landmark} />}
        action={
          headingsTab ? (
            <Link to={addFinancialHeadingPath(account.id, pathname)}>
              <Button>
                <Plus className="size-4" />
                {t('bankAccounts.addHeading')}
              </Button>
            </Link>
          ) : undefined
        }
      />
      <FormCard icon={Landmark} title={account.bankName}>
        <BankAccountSectionTabs section={section} onChange={setSection} />
        {headingsTab ? (
          <AccountFinancialHeadings accountId={account.id} />
        ) : (
          <BankAccountForm
            embedded
            initial={{
              bankName: account.bankName,
              accountNumber: account.accountNumber,
              cardNumber: account.cardNumber ?? '',
              iban: account.iban ?? '',
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
        )}
      </FormCard>
    </div>
  )
}
