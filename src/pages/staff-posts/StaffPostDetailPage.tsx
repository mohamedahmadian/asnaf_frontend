import { FileText, ToggleRight, Type, UserRoundCog } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  baseInfoFormShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import type { StaffPost } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'

export function StaffPostDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['staff-post', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StaffPost>(`/staff-posts/${id}`)
      return data
    },
  })

  const item = query.data
  if (!item) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={UserRoundCog}
        title={t('staffPosts.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={UserRoundCog} />}
      />
      <FormCard icon={UserRoundCog} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={UserRoundCog}>{t('staffPosts.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('staffPosts.title')} value={item.title} tone="teal" />
            <FormFactTile
              icon={ToggleRight}
              label={t('staffPosts.isActive')}
              value={<GeoStatus active={item.isActive} />}
              tone="mint"
            />
            <FormFactTile
              icon={FileText}
              label={t('staffPosts.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`/base-info/staff-posts/${item.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('staffPosts.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('staffPosts.confirmDelete'),
                successMessage: t('staffPosts.deleted'),
                path: `/staff-posts/${item.id}`,
                queryKey: ['staff-posts'],
                onDeleted: () => navigate('/base-info/staff-posts'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
