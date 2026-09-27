import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthGuestLayout } from '../components/auth/AuthGuestLayout'
import { FormCard } from '../components/ui/FormLayout'
import { LoadingState } from '../components/ui/LoadingState'
import { setImpersonateToken } from '../lib/auth-token'
import { LogIn } from 'lucide-react'

export function ImpersonateEntryPage() {
  const { t } = useTranslation()
  const [error, setError] = useState('')

  useEffect(() => {
    function applyFromHash() {
      const raw = window.location.hash.replace(/^#/, '').trim()
      if (!raw) return false
      setImpersonateToken(decodeURIComponent(raw))
      window.location.replace('/')
      return true
    }

    if (applyFromHash()) return

    const onHash = () => {
      applyFromHash()
    }
    window.addEventListener('hashchange', onHash)
    const timer = window.setTimeout(() => {
      if (!window.location.hash.replace(/^#/, '').trim()) {
        setError(t('auth.impersonateInvalid'))
      }
    }, 8000)

    return () => {
      window.removeEventListener('hashchange', onHash)
      window.clearTimeout(timer)
    }
  }, [t])

  if (error) {
    return (
      <AuthGuestLayout>
        <FormCard icon={LogIn} title={t('auth.enterUserPanel')}>
          <p className="p-5 text-sm leading-7 text-ink-600 sm:p-6">{error}</p>
        </FormCard>
      </AuthGuestLayout>
    )
  }

  return (
    <AuthGuestLayout>
      <FormCard icon={LogIn} title={t('auth.enterUserPanel')}>
        <div className="p-5 sm:p-6">
          <LoadingState variant="inline" />
          <p className="mt-3 text-center text-sm text-ink-500">{t('auth.impersonatePreparing')}</p>
        </div>
      </FormCard>
    </AuthGuestLayout>
  )
}
