import { History, UserRound, MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Button,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
} from '../../components/ui/Form'
import { api, getApiErrorMessage } from '../../lib/api'
import type { ManagedUser } from '../../types/app'
import { UserLocationForm } from '../location/UserLocationForm'

export function UserLocationPage() {
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
    <div className={formShellClassName}>
      <PageHeader
        icon={MapPin}
        title={t('location.register')}
        subtitle={<EntityNameSubtitle name={query.data.fullName} icon={UserRound} />}
        action={
          <Link to={`/users/${id}/location/history`}>
            <Button type="button" variant="soft">
              <History className="size-4" aria-hidden />
              {t('location.history')}
            </Button>
          </Link>
        }
      />
      <UserLocationForm
        initial={query.data}
        onSubmit={async (payload) => {
          try {
            await api.patch(`/users/${id}/location`, payload)
            toast.success(t('location.saved'))
            navigate('/users')
          } catch (error) {
            toast.error(getApiErrorMessage(error, t('common.error')))
          }
        }}
      />
    </div>
  )
}
