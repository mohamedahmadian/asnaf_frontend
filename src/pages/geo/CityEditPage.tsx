import { MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { City, Country, Province } from '../../types/app'
import { CityForm } from './CityForm'

export function CityEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['city', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<City>(`/cities/${id}`)
      return data
    },
  })
  const [countryId, setCountryId] = useState('')

  const resolvedCountryId = countryId || query.data?.province.country.id || ''

  const countries = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data } = await api.get<Country[]>('/countries')
      return data
    },
  })

  const provinces = useQuery({
    queryKey: ['provinces', resolvedCountryId],
    enabled: Boolean(resolvedCountryId),
    queryFn: async () => {
      const { data } = await api.get<Province[]>('/provinces', {
        params: { countryId: resolvedCountryId },
      })
      return data
    },
  })

  if (!query.data || !countries.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={MapPin} title={t('cities.edit')} subtitle={t('cities.editSubtitle')} />
      <CityForm
        initial={{
          provinceId: query.data.provinceId,
          code: query.data.code,
          nameFa: query.data.nameFa,
          nameEn: query.data.nameEn,
          neshanAddress: query.data.neshanAddress,
          latitude: query.data.latitude,
          longitude: query.data.longitude,
          isProvinceCapital: query.data.isProvinceCapital,
          hasRailway: query.data.hasRailway,
          hasAirport: query.data.hasAirport,
          isActive: query.data.isActive,
          sortOrder: query.data.sortOrder,
        }}
        countries={countries.data}
        provinces={provinces.data ?? []}
        countryId={resolvedCountryId}
        onCountryChange={setCountryId}
        onSubmit={async (payload) => {
          await api.patch(`/cities/${id}`, payload)
          toast.success(t('cities.updated'))
          navigate('/base-info/cities')
        }}
      />
    </div>
  )
}
