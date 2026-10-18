import {
  CreditCard,
  FileText,
  Hash,
  Landmark,
  Receipt,
  Star,
  ToggleRight,
  Wallet,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'
import { toLatinDigits } from '../../lib/datetime'

export type BankAccountPayload = {
  bankName: string
  accountNumber: string
  cardNumber?: string | null
  iban?: string | null
  paymentId?: string | null
  description?: string | null
  isActive: boolean
  isDefault: boolean
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
  const [paymentId, setPaymentId] = useState(initial?.paymentId ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)
  const [saving, setSaving] = useState(false)

  function changeActive(next: boolean) {
    setIsActive(next)
    if (!next) setIsDefault(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        cardNumber: cardNumber.trim() || null,
        iban: iban.trim() || null,
        paymentId: paymentId.trim() || null,
        description: description.trim() || null,
        isActive,
        isDefault: isActive && isDefault,
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
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
        <FormField icon={Receipt} label={t('bankAccounts.paymentId')} htmlFor="paymentId">
          <input
            id="paymentId"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={paymentId}
            onChange={(e) => setPaymentId(toLatinDigits(e.target.value).replace(/\D/g, ''))}
            maxLength={100}
          />
        </FormField>
        </div>
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
        <div className="grid gap-4 sm:grid-cols-2">
        <FormField icon={Star} label={t('bankAccounts.isDefault')} htmlFor="isDefault">
          <ToggleField
            id="isDefault"
            checked={isActive && isDefault}
            onChange={setIsDefault}
            disabled={!isActive}
            onLabel={t('bankAccounts.defaultOn')}
            offLabel={t('bankAccounts.defaultOff')}
          />
          <p className="text-xs text-ink-500">
            {isActive ? t('bankAccounts.defaultHint') : t('bankAccounts.defaultNeedsActive')}
          </p>
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('bankAccounts.isActive')} htmlFor="isActive">
            <ToggleField
              id="isActive"
              checked={isActive}
              onChange={changeActive}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        ) : null}
        </div>
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
