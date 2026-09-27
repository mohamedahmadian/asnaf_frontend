import { UserRound } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthProvider'
import { LoadingState, PageHeader, userFormShellClassName } from '../components/ui/Form'
import { applyUiLanguage, persistPreferredLocale, selectableLocale } from '../i18n'
import { api } from '../lib/api'
import type { ManagedUser } from '../types/app'
import { UserForm } from './users/UserForm'

export function AccountPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const queryClient = useQueryClient()
  const profile = useQuery({
    queryKey: ['account'],
    queryFn: async () => {
      const { data } = await api.get<ManagedUser>('/account')
      return data
    },
  })

  if (!profile.data) {
    return <LoadingState />
  }

  return (
    <div className={userFormShellClassName}>
      <PageHeader icon={UserRound} title={t('account.title')} subtitle={t('account.subtitle')} />
      <UserForm
        key={profile.data.updatedAt}
        initial={profile.data}
        hidePassword
        hideStatus
        requirePassword={false}
        selfProfile
        identityCheckPath="/account/identity-check"
        onCancel={() => navigate('/dashboard')}
        onSubmit={async (payload) => {
          const {
            password: _password,
            status: _status,
            roleIds: _roleIds,
            workUnitId: _workUnitId,
            staffPostId: _staffPostId,
            ...body
          } = payload
          await api.patch('/account', body)
          const nextLocale = selectableLocale(body.locale)
          persistPreferredLocale(nextLocale)
          applyUiLanguage(nextLocale)
          await Promise.all([
            refresh(),
            queryClient.invalidateQueries({ queryKey: ['account'] }),
          ])
          toast.success(t('account.saved'))
        }}
      />
    </div>
  )
}
