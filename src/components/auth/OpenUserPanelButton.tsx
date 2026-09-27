import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthProvider'
import { openUserPanel } from '../../lib/open-user-panel'
import { isAdmin } from '../../lib/roles'
import type { UserStatus } from '../../types/app'
import { Button } from '../ui/Form'

export function OpenUserPanelButton({
  userId,
  status,
  iconOnly = false,
  label: labelProp,
  className = '',
}: {
  userId: string
  status?: UserStatus | null
  iconOnly?: boolean
  label?: string
  className?: string
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [pending, setPending] = useState(false)

  if (!isAdmin(user) || user?.impersonating) {
    return null
  }

  const inactive = status === 'INACTIVE'
  const label = labelProp ?? t('auth.enterUserPanel')

  async function onClick() {
    if (inactive) {
      return
    }
    setPending(true)
    try {
      await openUserPanel(userId, t('auth.impersonateFailed'), t('auth.impersonatePopupBlocked'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant={iconOnly ? 'ghost' : 'soft'}
      icon={iconOnly}
      className={className}
      disabled={pending || inactive}
      title={inactive ? t('auth.impersonateInactive') : label}
      aria-label={label}
      onClick={() => void onClick()}
    >
      <LogIn className="size-4" aria-hidden />
      {iconOnly ? null : label}
    </Button>
  )
}
