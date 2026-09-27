import { Flag, Globe, Hash, Languages, Map } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingState, DetailActions, EntityNameSubtitle, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { api } from '../../lib/api'
import { useGeoName } from '../../lib/geo'
import type { Country } from '../../types/app'
import { GeoStatus } from './GeoShared'

export function CountryDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const name = useGeoName()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['country', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Country>(`/countries/${id}`)
      return data
    },
  })

  const country = query.data
  if (!country) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Globe}
        title={t('countries.details')}
        subtitle={<EntityNameSubtitle name={name(country)} icon={Globe} />}
      />
      <FormCard icon={Globe} title={name(country)}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Globe}>{t('countries.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Languages} label={t('geo.nameFa')} value={country.nameFa} tone="teal" />
            <FormFactTile icon={Languages} label={t('geo.nameEn')} value={country.nameEn} tone="mint" />
            <FormFactTile icon={Hash} label={t('geo.iso2')} value={country.iso2} />
            <FormFactTile icon={Hash} label={t('geo.iso3')} value={country.iso3 ?? '—'} />
            <FormFactTile
              icon={Flag}
              label={t('geo.phoneCode')}
              value={country.phoneCode ? localizeDigits(country.phoneCode, locale) : '—'}
            />
            <FormFactTile
              icon={Map}
              label={t('geo.provinceCount')}
              value={formatNumber(country._count?.provinces ?? 0, locale)}
            />
            <FormFactTile icon={Globe} label={t('geo.isActive')} value={<GeoStatus active={country.isActive} />} />
          </div>
          <DetailActions
            editTo={`/base-info/countries/${country.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('countries.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('countries.confirmDelete'),
                successMessage: t('countries.deleted'),
                path: `/countries/${country.id}`,
                queryKey: ['countries'],
                onDeleted: () => navigate('/base-info/countries'),
              })
            }
            extraItems={[
              {
                to: `/base-info/provinces?countryId=${country.id}`,
                icon: Map,
                label: t('menus.provinces'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}
