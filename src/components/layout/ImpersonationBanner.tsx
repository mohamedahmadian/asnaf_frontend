import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../ui/Form'

export function ImpersonationBanner() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  if (!user?.impersonating) return null

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-teal-200 bg-teal-50 px-4 py-2.5 sm:px-8">
      <p className="text-sm font-medium text-teal-900">
        {t('auth.impersonateBanner', { name: user.fullName })}
        {user.impersonatedBy?.fullName
          ? ` · ${t('auth.impersonateBannerBy', { name: user.impersonatedBy.fullName })}`
          : ''}
      </p>
      <Button type="button" variant="ghost" onClick={() => logout()}>
        <LogOut className="size-4" aria-hidden />
        {t('auth.impersonateEnd')}
      </Button>
    </div>
  )
}
