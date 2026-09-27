import { Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { AppRole } from '../../types/app'
import { RoleForm } from './RoleForm'

export function RoleEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['role', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<AppRole>(`/roles/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Shield}
        title={t('accessRoles.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Shield} />}
      />
      <RoleForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/roles/${id}`, payload)
          toast.success(t('accessRoles.updated'))
          navigate('/base-info/roles')
        }}
      />
    </div>
  )
}
