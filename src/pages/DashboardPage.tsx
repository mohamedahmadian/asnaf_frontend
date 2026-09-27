import { LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { PageHeader, formShellClassName } from '../components/ui/Form'
import { FormCard, FormEmptyHint } from '../components/ui/FormLayout'

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <div className={`${formShellClassName} space-y-5`}>
      <PageHeader
        icon={LayoutDashboard}
        title={t('dashboard.title')}
        subtitle={t('dashboard.welcomeUser', { name: user?.fullName ?? '' })}
      />
      <FormCard icon={LayoutDashboard} title={t('dashboard.subtitle')}>
        <div className="p-5 sm:p-6">
          <FormEmptyHint>{t('dashboard.empty')}</FormEmptyHint>
        </div>
      </FormCard>
    </div>
  )
}
