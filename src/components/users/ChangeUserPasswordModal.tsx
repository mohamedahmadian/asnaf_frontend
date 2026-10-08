import { KeyRound, MessageCircle, X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckboxField } from '../ui/CheckboxField'
import { AppForm, Button, FormActions, FormField, inputClassName } from '../ui/Form'
import { FormCard, formCardBodyClassName } from '../ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'

export function ChangeUserPasswordModal({
  userId,
  phone,
  onClose,
}: {
  userId: string
  phone: string | null | undefined
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [sendSms, setSendSms] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [smsError, setSmsError] = useState('')
  const [saving, setSaving] = useState(false)

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
    const nextPasswordError = password.length < 8 ? t('users.passwordMin') : ''
    const nextSmsError = sendSms && !phone?.trim() ? t('users.passwordPhoneRequired') : ''
    setPasswordError(nextPasswordError)
    setSmsError(nextSmsError)
    if (nextPasswordError || nextSmsError) return

    setSaving(true)
    try {
      const { data } = await api.patch<{ passwordSms?: { skipped?: boolean } }>(`/users/${userId}`, {
        password,
        ...(sendSms ? { sendPasswordToUser: true } : {}),
      })
      toast.success(
        sendSms
          ? data.passwordSms?.skipped
            ? t('users.passwordSmsPending')
            : t('users.passwordSent')
          : t('auth.passwordUpdated'),
      )
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('auth.changePassword')}
      data-nested-dialog
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <FormCard
        icon={KeyRound}
        title={t('auth.changePassword')}
        subtitle={t('users.changePasswordSubtitle')}
        className="relative z-10 w-full max-w-lg"
        onDoubleClick={() => undefined}
        action={
          <Button type="button" variant="ghost" icon onClick={onClose} aria-label={t('common.close')} disabled={saving}>
            <X className="size-4" aria-hidden />
          </Button>
        }
      >
        <AppForm onSubmit={submit} autoFocusFirst={false} className={formCardBodyClassName}>
          <FormField icon={KeyRound} label={t('auth.newPassword')} htmlFor="adminNewPassword" error={passwordError}>
            <input
              id="adminNewPassword"
              type="password"
              className={inputClassName(Boolean(passwordError))}
              value={password}
              required
              minLength={8}
              autoFocus
              autoComplete="new-password"
              aria-invalid={Boolean(passwordError)}
              onChange={(event) => {
                setPassword(event.target.value)
                setPasswordError('')
              }}
            />
          </FormField>
          <FormField icon={MessageCircle} label={t('users.sendPasswordToUser')} htmlFor="sendPasswordSms" error={smsError}>
            <CheckboxField
              id="sendPasswordSms"
              checked={sendSms}
              label={t('users.sendPasswordToUserHint')}
              onChange={(checked) => {
                setSendSms(checked)
                setSmsError('')
              }}
            />
          </FormField>
          <FormActions
            submitLabel={t('auth.changePassword')}
            cancelLabel={t('common.cancel')}
            submitting={saving}
            onCancel={onClose}
            headerIcons={false}
          />
        </AppForm>
      </FormCard>
    </div>,
    document.body,
  )
}
