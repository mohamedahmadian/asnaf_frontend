import { UserRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  userFormShellClassName,
} from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { ManagedUser } from '../../types/app'
import { UserForm } from './UserForm'

export function UserEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['user', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ManagedUser>(`/users/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={UserRound}
        title={t('users.edit')}
        subtitle={<EntityNameSubtitle name={query.data.fullName} icon={UserRound} />}
      />
      <UserForm
        initial={query.data}
        requirePassword={false}
        onCancel={() => navigate(`/users/${id}`)}
        onSubmit={async (payload) => {
          await api.patch(`/users/${query.data.id}`, payload)
          toast.success(t('users.updated'))
          navigate('/users')
        }}
      />
    </div>
  )
}
