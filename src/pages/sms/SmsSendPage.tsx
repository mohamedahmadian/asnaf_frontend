import { MessageSquareText, Phone, Send } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AppForm,
  FormActions,
  FormField,
  PageHeader,
  formShellClassName,
  inputClassName,
} from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { parseDigitString } from '../../lib/datetime'

export function SmsSendPage() {
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [body, setBody] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [bodyError, setBodyError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextPhone = parseDigitString(phone)
    const nextBody = body.trim()
    const nextPhoneError = /^09\d{9}$/.test(nextPhone) ? '' : t('sms.phoneInvalid')
    const nextBodyError = nextBody ? '' : t('sms.bodyRequired')
    setPhoneError(nextPhoneError)
    setBodyError(nextBodyError)
    if (nextPhoneError || nextBodyError) return

    setSending(true)
    try {
      await api.post('/sms/messages', { phone: nextPhone, body: nextBody })
      toast.success(t('sms.sent'))
      setPhone('')
      setBody('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader icon={Send} title={t('menus.smsSend')} subtitle={t('sms.sendSubtitle')} />
      <FormCard icon={Send} title={t('menus.smsSend')} subtitle={t('sms.sendSubtitle')}>
        <AppForm onSubmit={submit} className={formCardBodyClassName}>
          <FormField icon={Phone} label={t('sms.phone')} htmlFor="smsPhone" error={phoneError}>
            <input
              id="smsPhone"
              className={`${inputClassName(Boolean(phoneError))} digit-field`}
              value={phone}
              required
              inputMode="numeric"
              autoComplete="tel"
              maxLength={11}
              placeholder={t('sms.phonePlaceholder')}
              aria-invalid={Boolean(phoneError)}
              onChange={(event) => {
                setPhone(parseDigitString(event.target.value).slice(0, 11))
                setPhoneError('')
              }}
            />
          </FormField>
          <FormField icon={MessageSquareText} label={t('sms.body')} htmlFor="smsBody" error={bodyError}>
            <textarea
              id="smsBody"
              className={inputClassName(Boolean(bodyError))}
              value={body}
              required
              rows={5}
              maxLength={1000}
              placeholder={t('sms.bodyPlaceholder')}
              aria-invalid={Boolean(bodyError)}
              onChange={(event) => {
                setBody(event.target.value)
                setBodyError('')
              }}
            />
          </FormField>
          <p className="text-sm text-ink-500">{t('sms.mockHint')}</p>
          <FormActions submitLabel={t('sms.send')} submitting={sending} />
        </AppForm>
      </FormCard>
    </div>
  )
}
