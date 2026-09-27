import { MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { Country, Province } from '../../types/app'
import { CityForm } from './CityForm'

export function CityCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [countryId, setCountryId] = useState(searchParams.get('countryId') ?? '')
  const initialProvinceId = searchParams.get('provinceId') ?? ''

  const countries = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data } = await api.get<Country[]>('/countries')
      return data
    },
  })

  const provinces = useQuery({
    queryKey: ['provinces', countryId],
    enabled: Boolean(countryId),
    queryFn: async () => {
      const { data } = await api.get<Province[]>('/provinces', {
        params: { countryId },
      })
      return data
    },
  })

  if (!countries.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={MapPin} title={t('cities.create')} />
      <CityForm
        initial={
          initialProvinceId
            ? {
                provinceId: initialProvinceId,
                code: '',
                nameFa: '',
                nameEn: '',
                neshanAddress: null,
                latitude: null,
                longitude: null,
                isProvinceCapital: false,
                hasRailway: false,
                hasAirport: false,
                isActive: true,
                sortOrder: 0,
              }
            : undefined
        }
        countries={countries.data}
        provinces={provinces.data ?? []}
        countryId={countryId}
        onCountryChange={setCountryId}
        onSubmit={async (payload) => {
          await api.post('/cities', payload)
          toast.success(t('cities.created'))
          navigate('/base-info/cities')
        }}
      />
    </div>
  )
}
