import { FileText, MapPin, MapPinned } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AppForm,
  FormActions,
  FormField,
  fieldClassName,
} from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { OsmMapPicker, type MapBounds, type MapFocus } from '../../components/ui/OsmMapPicker'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api } from '../../lib/api'
import { geoErrorI18nKey } from '../../lib/geolocation'
import { IRAN_MAP_BOUNDS, IRAN_MAP_CENTER, nearestGeoItem, pointBounds, useGeoName } from '../../lib/geo'
import type { City, Country, ManagedUser, Province } from '../../types/app'

export type UserLocationPayload = {
  provinceId: string | null
  cityId: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  source?: 'MANUAL' | 'APP' | 'STATION'
}

function toCoordString(value: number | null | undefined) {
  return value == null ? '' : String(value)
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function UserLocationForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<
    ManagedUser,
    'locationProvinceId' | 'locationCityId' | 'latitude' | 'longitude' | 'locationNotes'
  >
  onSubmit: (payload: UserLocationPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const geoName = useGeoName()
  const [provinceId, setProvinceId] = useState(initial?.locationProvinceId ?? '')
  const [cityId, setCityId] = useState(initial?.locationCityId ?? '')
  const [latitude, setLatitude] = useState(toCoordString(initial?.latitude))
  const [longitude, setLongitude] = useState(toCoordString(initial?.longitude))
  const [notes, setNotes] = useState(initial?.locationNotes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const provinceIdRef = useRef(provinceId)
  const cityIdRef = useRef(cityId)
  provinceIdRef.current = provinceId
  cityIdRef.current = cityId

  const countries = useQuery({
    queryKey: ['countries', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Country[]>('/countries', { params: { activeOnly: true } })
      return data
    },
  })
  const iranId = countries.data?.find((country) => country.iso2 === 'IR')?.id
  const provinces = useQuery({
    queryKey: ['provinces', 'lookup', iranId ?? 'all'],
    enabled: countries.isSuccess,
    queryFn: async () => {
      const { data } = await api.get<Province[]>('/provinces', {
        params: iranId ? { countryId: iranId, activeOnly: true } : { activeOnly: true },
      })
      return data
    },
  })
  const cities = useQuery({
    queryKey: ['cities', 'lookup', provinceId],
    enabled: Boolean(provinceId),
    queryFn: async () => {
      const { data } = await api.get<City[]>('/cities', {
        params: { provinceId, activeOnly: true },
      })
      return data
    },
  })

  const selectedProvince = provinces.data?.find((item) => item.id === provinceId)
  const selectedCity = cities.data?.find((item) => item.id === cityId)
  const hasPin = toOptionalNumber(latitude) != null && toOptionalNumber(longitude) != null

  const focus = useMemo((): MapFocus | null => {
    if (selectedCity?.latitude != null && selectedCity.longitude != null) {
      return { lat: selectedCity.latitude, lng: selectedCity.longitude, zoom: 13 }
    }
    if (selectedProvince?.latitude != null && selectedProvince.longitude != null) {
      return { lat: selectedProvince.latitude, lng: selectedProvince.longitude, zoom: 8 }
    }
    if (hasPin) return null
    return { lat: IRAN_MAP_CENTER.lat, lng: IRAN_MAP_CENTER.lng, zoom: 6, bounds: IRAN_MAP_BOUNDS }
  }, [hasPin, selectedCity, selectedProvince])

  const maxBounds = useMemo((): MapBounds | null => {
    if (selectedCity?.latitude != null && selectedCity.longitude != null) {
      return pointBounds(selectedCity.latitude, selectedCity.longitude, 0.2)
    }
    if (selectedProvince?.latitude != null && selectedProvince.longitude != null) {
      return pointBounds(selectedProvince.latitude, selectedProvince.longitude, 2.2)
    }
    return null
  }, [selectedCity, selectedProvince])

  async function matchCityFromGps(lat: string, lng: string) {
    if (provinceIdRef.current || cityIdRef.current) return
    try {
      const { data } = await api.get<City[]>('/cities', { params: { activeOnly: true } })
      const city = nearestGeoItem(Number(lat), Number(lng), data)
      if (!city) return
      setProvinceId(city.provinceId)
      setCityId(city.id)
      toast.success(t('location.geoFoundCity', { city: geoName(city) }))
    } catch {
      /* keep pin */
    }
  }

  async function submit() {
    setSubmitting(true)
    try {
      await onSubmit({
        provinceId: provinceId || null,
        cityId: cityId || null,
        latitude: toOptionalNumber(latitude),
        longitude: toOptionalNumber(longitude),
        notes: notes.trim() || null,
        source: 'MANUAL',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormCard icon={MapPinned} title={t('location.register')} subtitle={t('location.registerSubtitle')}>
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={MapPinned} label={t('geo.province')} htmlFor="locationProvinceId">
            <SearchSelect
              id="locationProvinceId"
              value={provinceId}
              onChange={(next) => {
                setProvinceId(next)
                setCityId('')
              }}
              placeholder={t('geo.selectProvince')}
              options={[
                { value: '', label: t('geo.selectProvince') },
                ...(provinces.data ?? []).map((province) => ({
                  value: province.id,
                  label: geoName(province),
                })),
              ]}
            />
          </FormField>
          <FormField icon={MapPin} label={t('geo.city')} htmlFor="locationCityId">
            <SearchSelect
              id="locationCityId"
              value={cityId}
              disabled={!provinceId}
              onChange={setCityId}
              placeholder={t('geo.selectCity')}
              options={[
                { value: '', label: t('geo.selectCity') },
                ...(cities.data ?? []).map((city) => ({
                  value: city.id,
                  label: geoName(city),
                })),
              ]}
            />
          </FormField>
        </div>
        <div className="space-y-2">
          <p className="text-xs leading-6 text-ink-500">{t('location.mapHint')}</p>
          <OsmMapPicker
            variant="always"
            autoGeolocate
            latitude={latitude}
            longitude={longitude}
            focus={focus}
            maxBounds={maxBounds}
            heightClass="h-72 sm:h-80"
            onChange={(nextLat, nextLng) => {
              setLatitude(nextLat)
              setLongitude(nextLng)
            }}
            onGeolocate={(nextLat, nextLng) => {
              void matchCityFromGps(nextLat, nextLng)
            }}
            onGeoError={(kind) => toast.error(t(geoErrorI18nKey(kind)))}
            onGeoOutside={() => toast.error(t('location.outsideSelectedArea'))}
          />
        </div>
        <FormField icon={FileText} label={t('location.notes')} htmlFor="locationNotes">
          <textarea
            id="locationNotes"
            className={fieldClassName}
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('location.notesPlaceholder')}
          />
        </FormField>
        <FormActions submitLabel={t('location.register')} submitting={submitting} className="justify-center" />
      </AppForm>
    </FormCard>
  )
}
