import { FileText, MapPinned, ToggleRight, Type } from 'lucide-react'
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
import type { RegistrationPlace } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'

export function RegistrationPlaceDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['registration-place', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<RegistrationPlace>(`/registration-places/${id}`)
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
        icon={MapPinned}
        title={t('registrationPlaces.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={MapPinned} />}
      />
      <FormCard icon={MapPinned} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={MapPinned}>{t('registrationPlaces.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('registrationPlaces.title')} value={item.title} tone="teal" />
            <FormFactTile
              icon={ToggleRight}
              label={t('registrationPlaces.isActive')}
              value={<GeoStatus active={item.isActive} />}
              tone="mint"
            />
            <FormFactTile
              icon={FileText}
              label={t('registrationPlaces.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`/base-info/registration-places/${item.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('registrationPlaces.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('registrationPlaces.confirmDelete'),
                successMessage: t('registrationPlaces.deleted'),
                path: `/registration-places/${item.id}`,
                queryKey: ['registration-places'],
                onDeleted: () => navigate('/base-info/registration-places'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
