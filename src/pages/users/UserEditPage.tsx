import { KeyRound, Send, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { SendUserSmsModal } from '../../components/sms/SendUserSmsModal'
import { ChangeUserPasswordModal } from '../../components/users/ChangeUserPasswordModal'
import {
  Button,
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
  const [smsOpen, setSmsOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
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
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="soft" onClick={() => setPasswordOpen(true)}>
              <KeyRound className="size-4" aria-hidden />
              {t('auth.changePassword')}
            </Button>
            <Button type="button" variant="soft" onClick={() => setSmsOpen(true)}>
              <Send className="size-4" aria-hidden />
              {t('sms.send')}
            </Button>
          </div>
        }
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
      {smsOpen ? (
        <SendUserSmsModal
          phone={query.data.phone}
          recipientName={query.data.fullName}
          onClose={() => setSmsOpen(false)}
        />
      ) : null}
      {passwordOpen ? (
        <ChangeUserPasswordModal
          userId={query.data.id}
          phone={query.data.phone}
          onClose={() => setPasswordOpen(false)}
        />
      ) : null}
    </div>
  )
}
