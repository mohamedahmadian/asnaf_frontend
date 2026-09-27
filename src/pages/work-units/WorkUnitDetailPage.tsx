import { FileText, Network, ToggleRight, Type } from 'lucide-react'
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
import type { WorkUnit } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'

export function WorkUnitDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['work-unit', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<WorkUnit>(`/work-units/${id}`)
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
        icon={Network}
        title={t('workUnits.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={Network} />}
      />
      <FormCard icon={Network} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Network}>{t('workUnits.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('workUnits.title')} value={item.title} tone="teal" />
            <FormFactTile
              icon={ToggleRight}
              label={t('workUnits.isActive')}
              value={<GeoStatus active={item.isActive} />}
              tone="mint"
            />
            <FormFactTile
              icon={FileText}
              label={t('workUnits.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`/base-info/work-units/${item.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('workUnits.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('workUnits.confirmDelete'),
                successMessage: t('workUnits.deleted'),
                path: `/work-units/${item.id}`,
                queryKey: ['work-units'],
                onDeleted: () => navigate('/base-info/work-units'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
