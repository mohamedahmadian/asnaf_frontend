import { Banknote, FileText, HandCoins, ScrollText, ToggleRight, Type, Workflow } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AmountInput } from '../../components/ui/AmountInput'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, localizeDigits, parseGroupedAmount } from '../../lib/datetime'
import {
  financialProcessTypes,
  type FinancialHeading,
  type FinancialProcessType,
  type Paginated,
} from '../../types/app'
import { financialHeadingOptionLabel } from '../financial-headings/FinancialHeadingForm'

export type MunicipalFeeBankAccount = {
  id: string
  bankName: string
  accountNumber: string
  isActive: boolean
}

export type MunicipalFeeFinancialHeading = {
  id: string
  title: string
  paymentId: string | null
  bankAccount: MunicipalFeeBankAccount
}

export type MunicipalFeePayload = {
  title: string
  financialHeadingId: string
  amount: number
  processTypes: FinancialProcessType[]
  description?: string | null
  isActive: boolean
  financialHeading?: MunicipalFeeFinancialHeading | null
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

function asHeadingList(data: FinancialHeading[] | Paginated<FinancialHeading>) {
  return Array.isArray(data) ? data : data.items
}

export function MunicipalFeeForm({
  initial,
  presetFinancialHeadingId,
  lockFinancialHeading = false,
  onSubmit,
}: {
  initial?: MunicipalFeePayload
  presetFinancialHeadingId?: string
  lockFinancialHeading?: boolean
  onSubmit: (payload: MunicipalFeePayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [title, setTitle] = useState(initial?.title ?? '')
  const [financialHeadingId, setFinancialHeadingId] = useState(
    initial?.financialHeadingId ?? presetFinancialHeadingId ?? '',
  )
  const [amount, setAmount] = useState(
    initial?.amount != null ? formatGroupedNumber(initial.amount, locale) : '',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [processTypes, setProcessTypes] = useState<FinancialProcessType[]>(
    initial?.processTypes ?? [],
  )
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const headingsQuery = useQuery({
    queryKey: ['financial-headings', 'lookup', 'municipal-fees'],
    queryFn: async () => {
      const { data } = await api.get<FinancialHeading[] | Paginated<FinancialHeading>>(
        '/financial-headings',
      )
      return asHeadingList(data)
    },
  })

  const headingOptions = useMemo(() => {
    const headings = headingsQuery.data ?? []
    const options = headings.map((heading) => ({
      value: heading.id,
      label: financialHeadingOptionLabel(heading),
    }))
    if (
      initial?.financialHeading &&
      !options.some((option) => option.value === initial.financialHeading?.id)
    ) {
      options.unshift({
        value: initial.financialHeading.id,
        label: financialHeadingOptionLabel(initial.financialHeading),
      })
    }
    return options
  }, [headingsQuery.data, initial?.financialHeading])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const parsedAmount = parseGroupedAmount(amount)
      await onSubmit({
        title: title.trim(),
        financialHeadingId,
        amount: parsedAmount ?? 0,
        processTypes,
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
        <FormField
          icon={ScrollText}
          label={t('municipalFees.financialHeading')}
          htmlFor="municipalFeeFinancialHeading"
        >
          <SearchSelect
            id="municipalFeeFinancialHeading"
            value={financialHeadingId}
            onChange={setFinancialHeadingId}
            placeholder={t('municipalFees.selectFinancialHeading')}
            required
            disabled={lockFinancialHeading}
            options={headingOptions}
          />
        </FormField>
        <FormField icon={Banknote} label={t('municipalFees.amount')} htmlFor="municipalFeeAmount">
          <AmountInput id="municipalFeeAmount" value={amount} onChange={setAmount} required />
        </FormField>
        <FormField
          icon={Workflow}
          label={t('municipalFees.processTypes')}
          htmlFor="municipalFeeProcessTypes"
        >
          <div id="municipalFeeProcessTypes" className="grid gap-2 sm:grid-cols-2">
            {Object.values(financialProcessTypes).map((processType) => (
              <CheckboxField
                key={processType}
                id={`municipal-fee-process-${processType}`}
                checked={processTypes.includes(processType)}
                label={t(`municipalFees.processType.${processType}`)}
                onChange={(checked) =>
                  setProcessTypes((current) =>
                    checked
                      ? [...current, processType]
                      : current.filter((item) => item !== processType),
                  )
                }
              />
            ))}
          </div>
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
