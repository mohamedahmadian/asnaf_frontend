import { Flag, Hash, Languages, Map, MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingState, DetailActions, EntityNameSubtitle, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import { useGeoName } from '../../lib/geo'
import type { City } from '../../types/app'
import { GeoStatus, GeoYesNo } from './GeoShared'

export function CityDetailPage() {
  const { t } = useTranslation()
  const name = useGeoName()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['city', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<City>(`/cities/${id}`)
      return data
    },
  })

  const city = query.data
  if (!city) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={MapPin}
        title={t('cities.details')}
        subtitle={<EntityNameSubtitle name={name(city)} icon={MapPin} />}
      />
      <FormCard icon={MapPin} title={name(city)}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={MapPin}>{t('cities.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Languages} label={t('geo.nameFa')} value={city.nameFa} tone="teal" />
            <FormFactTile icon={Languages} label={t('geo.nameEn')} value={city.nameEn} tone="mint" />
            <FormFactTile icon={Hash} label={t('geo.code')} value={city.code} />
            <FormFactTile icon={Map} label={t('geo.province')} value={name(city.province)} />
            <FormFactTile icon={Flag} label={t('geo.country')} value={name(city.province.country)} />
            <FormFactTile
              icon={MapPin}
              label={t('geo.isProvinceCapital')}
              value={<GeoYesNo value={city.isProvinceCapital} />}
            />
            <FormFactTile icon={MapPin} label={t('geo.isActive')} value={<GeoStatus active={city.isActive} />} />
          </div>
          <DetailActions
            editTo={`/base-info/cities/${city.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('cities.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('cities.confirmDelete'),
                successMessage: t('cities.deleted'),
                path: `/cities/${city.id}`,
                queryKey: ['cities'],
                onDeleted: () => navigate('/base-info/cities'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
