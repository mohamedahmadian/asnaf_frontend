import { MessageSquareText, Phone, Send, X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api, getApiErrorMessage } from '../../lib/api'
import { parseDigitString } from '../../lib/datetime'
import { AppForm, Button, FormActions, FormField, inputClassName } from '../ui/Form'
import { FormCard, formCardBodyClassName } from '../ui/FormLayout'

function toMobileInput(phone: string | null | undefined) {
  let digits = parseDigitString(phone ?? '')
  if (digits.startsWith('0098')) digits = digits.slice(4)
  else if (digits.startsWith('98') && digits.length >= 12) digits = digits.slice(2)
  if (digits.startsWith('9') && digits.length === 10) digits = `0${digits}`
  return digits.slice(0, 11)
}

export function SendUserSmsModal({
  phone,
  recipientName,
  onClose,
}: {
  phone: string | null | undefined
  recipientName?: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [mobile, setMobile] = useState(() => toMobileInput(phone))
  const [body, setBody] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [bodyError, setBodyError] = useState('')
  const [sending, setSending] = useState(false)
  const title = recipientName?.trim()
    ? t('sms.toUserTitle', { name: recipientName.trim() })
    : t('sms.send')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextPhone = parseDigitString(mobile)
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
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-nested-dialog
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <FormCard
        icon={Send}
        title={title}
        subtitle={t('sms.toUserSubtitle')}
        className="relative z-10 w-full max-w-lg"
        onDoubleClick={() => undefined}
        action={
          <Button type="button" variant="ghost" icon onClick={onClose} aria-label={t('common.close')} disabled={sending}>
            <X className="size-4" aria-hidden />
          </Button>
        }
      >
        <AppForm onSubmit={submit} autoFocusFirst={false} className={formCardBodyClassName}>
          <FormField icon={Phone} label={t('sms.phone')} htmlFor="userSmsPhone" error={phoneError}>
            <input
              id="userSmsPhone"
              className={`${inputClassName(Boolean(phoneError))} digit-field`}
              value={mobile}
              required
              inputMode="numeric"
              autoComplete="tel"
              maxLength={11}
              placeholder={t('sms.phonePlaceholder')}
              aria-invalid={Boolean(phoneError)}
              onChange={(event) => {
                setMobile(parseDigitString(event.target.value).slice(0, 11))
                setPhoneError('')
              }}
            />
          </FormField>
          <FormField icon={MessageSquareText} label={t('sms.body')} htmlFor="userSmsBody" error={bodyError}>
            <textarea
              id="userSmsBody"
              className={inputClassName(Boolean(bodyError))}
              value={body}
              required
              rows={5}
              maxLength={1000}
              autoFocus
              placeholder={t('sms.bodyPlaceholder')}
              aria-invalid={Boolean(bodyError)}
              onChange={(event) => {
                setBody(event.target.value)
                setBodyError('')
              }}
            />
          </FormField>
          <p className="text-sm text-ink-500">{t('sms.mockHint')}</p>
          <FormActions
            submitLabel={t('sms.send')}
            cancelLabel={t('common.cancel')}
            submitting={sending}
            onCancel={onClose}
            headerIcons={false}
          />
        </AppForm>
      </FormCard>
    </div>,
    document.body,
  )
}
