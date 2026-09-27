import { Banknote, FileText, HandCoins, Landmark, ToggleRight, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AmountInput } from '../../components/ui/AmountInput'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, localizeDigits, parseGroupedAmount } from '../../lib/datetime'
import type { BankAccount } from '../../types/app'

export type MunicipalFeeBankAccount = {
  id: string
  bankName: string
  accountNumber: string
  isActive: boolean
}

export type MunicipalFeePayload = {
  title: string
  bankAccountId: string
  amount: number
  description?: string | null
  isActive: boolean
  bankAccount?: MunicipalFeeBankAccount | null
}

export function formatFeeAmount(value: number, locale: string) {
  return formatGroupedNumber(value, locale)
}

export function bankAccountOptionLabel(
  account: Pick<MunicipalFeeBankAccount, 'bankName' | 'accountNumber' | 'isActive'>,
  locale: string,
  inactiveLabel: string,
) {
  const label = `${account.bankName} — ${localizeDigits(account.accountNumber, locale)}`
  return account.isActive ? label : `${label} (${inactiveLabel})`
}

function asAccountList(data: BankAccount[] | { items: BankAccount[] }) {
  return Array.isArray(data) ? data : data.items
}

export function MunicipalFeeForm({
  initial,
  presetBankAccountId,
  lockAccount = false,
  onSubmit,
}: {
  initial?: MunicipalFeePayload
  presetBankAccountId?: string
  lockAccount?: boolean
  onSubmit: (payload: MunicipalFeePayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [title, setTitle] = useState(initial?.title ?? '')
  const [bankAccountId, setBankAccountId] = useState(initial?.bankAccountId ?? presetBankAccountId ?? '')
  const [amount, setAmount] = useState(
    initial?.amount != null ? formatGroupedNumber(initial.amount, locale) : '',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const accountsQuery = useQuery({
    queryKey: ['bank-accounts', 'lookup', 'municipal-fees'],
    queryFn: async () => {
      const { data } = await api.get<BankAccount[] | { items: BankAccount[] }>('/bank-accounts')
      return asAccountList(data)
    },
  })

  const accountOptions = useMemo(() => {
    const accounts = accountsQuery.data ?? []
    const options = accounts.map((account) => ({
      value: account.id,
      label: bankAccountOptionLabel(account, locale, t('geo.inactive')),
    }))
    if (
      initial?.bankAccount &&
      !options.some((option) => option.value === initial.bankAccount?.id)
    ) {
      options.unshift({
        value: initial.bankAccount.id,
        label: bankAccountOptionLabel(initial.bankAccount, locale, t('geo.inactive')),
      })
    }
    return options
  }, [accountsQuery.data, initial?.bankAccount, locale, t])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const parsedAmount = parseGroupedAmount(amount)
      await onSubmit({
        title: title.trim(),
        bankAccountId,
        amount: parsedAmount ?? 0,
        description: description.trim() || null,
        isActive,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={HandCoins}
      title={initial ? initial.title : t('municipalFees.create')}
      subtitle={initial ? undefined : t('municipalFees.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('municipalFees.title')} htmlFor="municipalFeeTitle">
          <input
            id="municipalFeeTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={Landmark} label={t('municipalFees.bankAccount')} htmlFor="municipalFeeAccount">
          <SearchSelect
            id="municipalFeeAccount"
            value={bankAccountId}
            onChange={setBankAccountId}
            placeholder={t('municipalFees.selectAccount')}
            required
            disabled={lockAccount}
            options={accountOptions}
          />
        </FormField>
        <FormField icon={Banknote} label={t('municipalFees.amount')} htmlFor="municipalFeeAmount">
          <AmountInput id="municipalFeeAmount" value={amount} onChange={setAmount} required />
        </FormField>
        <FormField icon={FileText} label={t('municipalFees.description')} htmlFor="municipalFeeDescription">
          <textarea
            id="municipalFeeDescription"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('municipalFees.isActive')} htmlFor="municipalFeeActive">
            <ToggleField
              id="municipalFeeActive"
              checked={isActive}
              onChange={setIsActive}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        ) : null}
        <FormActions
          submitLabel={t('municipalFees.save')}
          cancelLabel={t('municipalFees.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
