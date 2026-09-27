import { UserRoundCog } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { StaffPost } from '../../types/app'
import { StaffPostForm } from './StaffPostForm'

export function StaffPostEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['staff-post', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StaffPost>(`/staff-posts/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={UserRoundCog}
        title={t('staffPosts.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={UserRoundCog} />}
      />
      <StaffPostForm
        initial={{
          title: query.data.title,
          description: query.data.description ?? '',
          isActive: query.data.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/staff-posts/${id}`, payload)
          toast.success(t('staffPosts.updated'))
          navigate('/base-info/staff-posts')
        }}
      />
    </div>
  )
}
