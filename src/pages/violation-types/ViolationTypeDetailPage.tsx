import { FileText, ShieldAlert, ToggleRight, Type } from 'lucide-react'
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
import type { ViolationType } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'

export function ViolationTypeDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['violation-type', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ViolationType>(`/violation-types/${id}`)
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
        icon={ShieldAlert}
        title={t('violationTypes.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={ShieldAlert} />}
      />
      <FormCard icon={ShieldAlert} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ShieldAlert}>{t('violationTypes.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('violationTypes.title')} value={item.title} tone="teal" />
            <FormFactTile
              icon={ToggleRight}
              label={t('violationTypes.isActive')}
              value={<GeoStatus active={item.isActive} />}
              tone="mint"
            />
            <FormFactTile
              icon={FileText}
              label={t('violationTypes.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`/inspection/violation-types/${item.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('violationTypes.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('violationTypes.confirmDelete'),
                successMessage: t('violationTypes.deleted'),
                path: `/violation-types/${item.id}`,
                queryKey: ['violation-types'],
                onDeleted: () => navigate('/inspection/violation-types'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
