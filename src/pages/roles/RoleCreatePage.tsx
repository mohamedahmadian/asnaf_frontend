import { Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { RoleForm } from './RoleForm'

export function RoleCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={formShellClassName}>
      <PageHeader icon={Shield} title={t('accessRoles.create')} />
      <RoleForm
        onSubmit={async (payload) => {
          await api.post('/roles', payload)
          toast.success(t('accessRoles.created'))
          navigate('/base-info/roles')
        }}
      />
    </div>
  )
}
