import { FileText, Hash, Landmark, ScrollText, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { toLatinDigits } from '../../lib/datetime'
import type { BankAccount, Paginated } from '../../types/app'
import { bankAccountOptionLabel } from '../municipal-fees/MunicipalFeeForm'

type HeadingBankAccount = {
  id: string
  bankName: string
  accountNumber: string
  isActive: boolean
}

export type FinancialHeadingPayload = {
  title: string
  description?: string | null
  bankAccountId: string
  paymentId: string | null
  bankAccount?: HeadingBankAccount | null
}

export function financialHeadingOptionLabel(
  heading: Pick<FinancialHeadingPayload, 'title'> & {
    bankAccount?: HeadingBankAccount | null
  },
) {
  return heading.bankAccount
    ? `${heading.title} — ${heading.bankAccount.bankName}`
    : heading.title
}

function asAccountList(data: BankAccount[] | Paginated<BankAccount>) {
  return Array.isArray(data) ? data : data.items
}

export function FinancialHeadingForm({
  initial,
  presetBankAccountId,
  lockAccount = false,
  embedded = false,
  onSubmit,
}: {
  initial?: FinancialHeadingPayload
  presetBankAccountId?: string
  lockAccount?: boolean
  embedded?: boolean
  onSubmit: (payload: FinancialHeadingPayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [bankAccountId, setBankAccountId] = useState(
    initial?.bankAccountId ?? presetBankAccountId ?? '',
  )
  const [paymentId, setPaymentId] = useState(initial?.paymentId ?? '')
  const [saving, setSaving] = useState(false)
  const accountsQuery = useQuery({
    queryKey: ['bank-accounts', 'lookup', 'financial-headings'],
    queryFn: async () => {
      const { data } = await api.get<BankAccount[] | Paginated<BankAccount>>('/bank-accounts')
      return asAccountList(data)
    },
  })

  const accountOptions = useMemo(() => {
    const options = (accountsQuery.data ?? []).map((account) => ({
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
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        bankAccountId,
        paymentId: toLatinDigits(paymentId).trim(),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const form = (
    <AppForm onSubmit={submit} className={formCardBodyClassName}>
      <div
        role={embedded ? 'tabpanel' : undefined}
        id={embedded ? 'form-panel-info' : undefined}
        aria-labelledby={embedded ? 'form-tab-info' : undefined}
        className="space-y-4"
      >
        <FormField icon={Type} label={t('financialHeadings.title')} htmlFor="financialHeadingTitle">
          <input
            id="financialHeadingTitle"
            className={fieldClassName}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField
          icon={FileText}
          label={t('financialHeadings.description')}
          htmlFor="financialHeadingDescription"
        >
          <textarea
            id="financialHeadingDescription"
            className={fieldClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        <FormField
          icon={Landmark}
          label={t('financialHeadings.bankAccount')}
          htmlFor="financialHeadingBankAccount"
        >
          <SearchSelect
            id="financialHeadingBankAccount"
            value={bankAccountId}
            onChange={setBankAccountId}
            placeholder={t('financialHeadings.selectAccount')}
            required
            disabled={lockAccount}
            options={accountOptions}
          />
        </FormField>
        <FormField
          icon={Hash}
          label={t('financialHeadings.paymentId')}
          htmlFor="financialHeadingPaymentId"
        >
          <input
            id="financialHeadingPaymentId"
            className={`${fieldClassName} digit-field`}
            value={paymentId}
            onChange={(event) =>
              setPaymentId(toLatinDigits(event.target.value).replace(/\D/g, ''))
            }
            inputMode="numeric"
            required
            maxLength={100}
          />
        </FormField>
        <FormActions
          submitLabel={t('financialHeadings.save')}
          cancelLabel={t('financialHeadings.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </div>
    </AppForm>
  )

  if (embedded) return form

  return (
    <FormCard
      icon={ScrollText}
      title={initial ? initial.title : t('financialHeadings.create')}
      subtitle={initial ? undefined : t('financialHeadings.createSubtitle')}
    >
      {form}
    </FormCard>
  )
}
