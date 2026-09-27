import { UserRoundCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { StaffPostForm } from './StaffPostForm'

export function StaffPostCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={UserRoundCog}
        title={t('staffPosts.create')}
      />
      <StaffPostForm
        onSubmit={async (payload) => {
          await api.post('/staff-posts', payload)
          toast.success(t('staffPosts.created'))
          navigate('/base-info/staff-posts')
        }}
      />
    </div>
  )
}
