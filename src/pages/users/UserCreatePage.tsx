import { UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, userFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { UserForm } from './UserForm'

export function UserCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={userFormShellClassName}>
      <PageHeader icon={UserRound} title={t('users.create')} />
      <UserForm
        hideStatus
        onCancel={() => navigate('/users')}
        onSubmit={async (payload) => {
          await api.post('/users', payload)
          toast.success(t('users.created'))
          navigate('/users')
        }}
      />
    </div>
  )
}
