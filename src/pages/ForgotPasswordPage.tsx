import { CircleAlert, IdCard, KeyRound, Mail, MessageSquare, PhoneOff } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthProvider'
import { AuthBackButton, AuthGuestLayout, AuthNotice } from '../components/auth/AuthGuestLayout'
import { AppForm, Button, FormField, fieldClassName } from '../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../lib/api'
import { toLatinDigits } from '../lib/datetime'

type ForgotStatus = 'sent' | 'no_phone' | 'no_email' | 'not_found'
type ForgotChannel = 'sms' | 'email'
type ForgotStep = 'identify' | 'channel'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [step, setStep] = useState<ForgotStep>('identify')
  const [submitting, setSubmitting] = useState<ForgotChannel | null>(null)
  const [status, setStatus] = useState<ForgotStatus | null>(null)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  function onIdentify(event: FormEvent) {
    event.preventDefault()
    const value = toLatinDigits(identifier.trim())
    if (value.length < 3) {
      toast.error(t('auth.required'))
      return
    }
    setStatus(null)
    setStep('channel')
  }

  async function recover(channel: ForgotChannel) {
    const value = toLatinDigits(identifier.trim())
    setSubmitting(channel)
    setStatus(null)
    try {
      const { data } = await api.post<{ status: ForgotStatus }>('/auth/forgot-password', {
        identifier: value,
        channel,
      })
      setStatus(data.status)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSubmitting(null)
    }
  }

  const backToLogin = (
    <p className="text-center text-sm">
      <Link
        to="/login"
        className="font-medium text-teal-700 hover:text-teal-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded-lg"
      >
        {t('auth.backToLogin')}
      </Link>
    </p>
  )

  return (
    <AuthGuestLayout>
      <FormCard
        icon={KeyRound}
        title={t('auth.forgotPassword')}
        subtitle={
          step === 'channel' ? t('auth.forgotPasswordChooseChannel') : t('auth.forgotPasswordSubtitle')
        }
        action={
          <AuthBackButton
            to={step === 'identify' ? '/login' : undefined}
            onClick={step === 'channel' ? () => setStep('identify') : undefined}
          />
        }
      >
        {status === 'sent' ? (
          <div className={`${formCardBodyClassName}`}>
            <AuthNotice icon={KeyRound} tone="teal">
              {t('auth.forgotPasswordSent')}
            </AuthNotice>
            {backToLogin}
          </div>
        ) : step === 'identify' ? (
          <AppForm className={formCardBodyClassName} onSubmit={onIdentify} autoFocusFirst>
            <FormField icon={IdCard} label={t('auth.username')} htmlFor="identifier">
              <input
                id="identifier"
                className={fieldClassName}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(toLatinDigits(e.target.value))
                  setStatus(null)
                }}
                placeholder={t('auth.identifier')}
                autoComplete="username"
                required
                minLength={3}
              />
            </FormField>
            <Button type="submit" className="w-full">
              <KeyRound className="size-4" aria-hidden />
              {t('auth.forgotPasswordSubmit')}
            </Button>
            {backToLogin}
          </AppForm>
        ) : (
          <div className={formCardBodyClassName}>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                className="w-full"
                disabled={Boolean(submitting)}
                onClick={() => void recover('sms')}
              >
                <MessageSquare className="size-4" aria-hidden />
                {t('auth.forgotPasswordViaSms')}
              </Button>
              <Button
                type="button"
                className="w-full"
                disabled={Boolean(submitting)}
                onClick={() => void recover('email')}
              >
                <Mail className="size-4" aria-hidden />
                {t('auth.forgotPasswordViaEmail')}
              </Button>
            </div>
            {backToLogin}
          </div>
        )}

        {status === 'no_phone' ? (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <AuthNotice icon={PhoneOff} tone="mint">
              {t('auth.forgotPasswordNoPhone')}
            </AuthNotice>
          </div>
        ) : null}

        {status === 'no_email' ? (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <AuthNotice icon={Mail} tone="mint">
              {t('auth.forgotPasswordNoEmail')}
            </AuthNotice>
          </div>
        ) : null}

        {status === 'not_found' ? (
          <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
            <AuthNotice icon={CircleAlert} tone="warn">
              {t('auth.forgotPasswordNotFound')}
            </AuthNotice>
          </div>
        ) : null}
      </FormCard>
    </AuthGuestLayout>
  )
}
