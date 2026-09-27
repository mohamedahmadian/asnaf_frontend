import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AuthGuestLayout } from '../components/auth/AuthGuestLayout'
import { Button } from '../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../components/ui/FormLayout'

export function ImpersonateEndedPage() {
  const { t } = useTranslation()

  return (
    <AuthGuestLayout>
      <FormCard icon={LogOut} title={t('auth.impersonateEndedTitle')}>
        <div className={formCardBodyClassName}>
          <p className="text-sm leading-7 text-ink-600">{t('auth.impersonateEndedHint')}</p>
          <Button type="button" onClick={() => window.close()}>
            {t('auth.impersonateCloseWindow')}
          </Button>
        </div>
      </FormCard>
    </AuthGuestLayout>
  )
}
