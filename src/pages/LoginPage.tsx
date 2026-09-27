import { KeyRound, Lock, User } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthProvider'
import { AuthGuestLayout } from '../components/auth/AuthGuestLayout'
import { AppForm, Button, FormField, fieldClassName } from '../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../components/ui/FormLayout'
import { isApiServerError } from '../lib/api'
import { afterAuthPath } from '../lib/auth-redirect'
import { toLatinDigits } from '../lib/datetime'

export function LoginPage() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const afterAuth = afterAuthPath(next)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to={afterAuth} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(toLatinDigits(username), toLatinDigits(password))
      navigate(afterAuth)
    } catch (error) {
      toast.error(
        isApiServerError(error) ? t('auth.serverUnavailable') : t('auth.loginFailed'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthGuestLayout>
      <FormCard
        icon={KeyRound}
        title={t('auth.loginTitle')}
      >
        <AppForm className={formCardBodyClassName} onSubmit={onSubmit} autoFocusFirst>
          <FormField icon={User} label={t('auth.username')} htmlFor="username">
            <input
              id="username"
              className={fieldClassName}
              value={username}
              onChange={(e) => setUsername(toLatinDigits(e.target.value))}
              placeholder={t('auth.identifier')}
              autoComplete="username"
              required
            />
          </FormField>
          <FormField icon={Lock} label={t('auth.password')} htmlFor="password">
            <input
              id="password"
              type="password"
              className={fieldClassName}
              value={password}
              onChange={(e) => setPassword(toLatinDigits(e.target.value))}
              minLength={8}
              autoComplete="current-password"
              required
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={submitting}>
            <KeyRound className="size-4" />
            {t('auth.login')}
          </Button>
          <Link
            to="/forgot-password"
            className="block text-center text-sm leading-7 text-teal-700 transition hover:text-teal-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded-xl"
          >
            {t('auth.forgotPasswordHint')}
          </Link>
        </AppForm>
      </FormCard>
    </AuthGuestLayout>
  )
}
