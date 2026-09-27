import {
  CreditCard,
  FileText,
  Hash,
  Landmark,
  ToggleRight,
  Type,
  Wallet,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'

export type BankAccountPayload = {
  bankName: string
  accountNumber: string
  cardNumber?: string | null
  iban?: string | null
  description?: string | null
  isActive: boolean
}

export function BankAccountForm({
  initial,
  onSubmit,
  embedded = false,
}: {
  initial?: BankAccountPayload
  onSubmit: (payload: BankAccountPayload) => Promise<void>
  /** داخل کارت صفحهٔ ویرایش؛ هدر کارت و تب‌ها بیرون فرم هستند */
  embedded?: boolean
}) {
  const { t } = useTranslation()
  const [bankName, setBankName] = useState(initial?.bankName ?? '')
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? '')
  const [cardNumber, setCardNumber] = useState(initial?.cardNumber ?? '')
  const [iban, setIban] = useState(initial?.iban ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        cardNumber: cardNumber.trim() || null,
        iban: iban.trim() || null,
        description: description.trim() || null,
        isActive,
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
        <FormField icon={Landmark} label={t('bankAccounts.bankName')} htmlFor="bankName">
          <input
            id="bankName"
            className={fieldClassName}
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
          />
        </FormField>
        <FormField icon={Hash} label={t('bankAccounts.accountNumber')} htmlFor="accountNumber">
          <input
            id="accountNumber"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
            title={t('bankAccounts.accountHint')}
          />
        </FormField>
        <FormField icon={CreditCard} label={t('bankAccounts.cardNumber')} htmlFor="cardNumber">
          <input
            id="cardNumber"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            title={t('bankAccounts.cardHint')}
          />
        </FormField>
        <FormField icon={Wallet} label={t('bankAccounts.iban')} htmlFor="iban">
          <input
            id="iban"
            className={`${fieldClassName} digit-field`}
            value={iban}
            onChange={(e) => setIban(e.target.value.toUpperCase())}
            title={t('bankAccounts.ibanHint')}
            placeholder="IR"
          />
        </FormField>
        <FormField icon={FileText} label={t('bankAccounts.description')} htmlFor="description">
          <textarea
            id="description"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('bankAccounts.isActive')} htmlFor="isActive">
            <ToggleField
              id="isActive"
              checked={isActive}
              onChange={setIsActive}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        ) : null}
        </div>
        <FormActions
          submitLabel={t('bankAccounts.save')}
          cancelLabel={t('bankAccounts.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
  )

  if (embedded) return form

  return (
    <FormCard
      icon={Landmark}
      title={initial ? initial.bankName : t('bankAccounts.create')}
      subtitle={initial ? undefined : t('bankAccounts.createSubtitle')}
    >
      {form}
    </FormCard>
  )
}
