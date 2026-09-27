import { Compass, Flag, Hash, Landmark, Languages, MapPinned, MapPin, Navigation, ToggleRight, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormField, FormActions, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../lib/api'
import { slugifyCode, useGeoName } from '../../lib/geo'
import type { Country, Province } from '../../types/app'

export type CityPayload = {
  provinceId: string
  code: string
  nameFa: string
  nameEn: string
  neshanAddress: string | null
  latitude: number | null
  longitude: number | null
  isProvinceCapital: boolean
  hasRailway: boolean
  hasAirport: boolean
  isActive: boolean
  sortOrder: number
}

export function CityForm({
  initial,
  countries,
  provinces,
  countryId,
  onCountryChange,
  onSubmit,
}: {
  initial?: CityPayload
  countries: Country[]
  provinces: Province[]
  countryId: string
  onCountryChange: (countryId: string) => void
  onSubmit: (payload: CityPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const name = useGeoName()
  const [provinceId, setProvinceId] = useState(initial?.provinceId ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [codeTouched, setCodeTouched] = useState(Boolean(initial?.code))
  const [nameFa, setNameFa] = useState(initial?.nameFa ?? '')
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '')
  const [neshanAddress, setNeshanAddress] = useState(initial?.neshanAddress ?? '')
  const [latitude, setLatitude] = useState(initial?.latitude != null ? String(initial.latitude) : '')
  const [longitude, setLongitude] = useState(initial?.longitude != null ? String(initial.longitude) : '')
  const [isProvinceCapital, setIsProvinceCapital] = useState(initial?.isProvinceCapital ?? false)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0))
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        provinceId,
        code: slugifyCode(code) || slugifyCode(nameEn),
        nameFa: nameFa.trim(),
        nameEn: nameEn.trim(),
        neshanAddress: emptyToNull(neshanAddress),
        latitude: toOptionalNumber(latitude),
        longitude: toOptionalNumber(longitude),
        isProvinceCapital,
        hasRailway: initial?.hasRailway ?? false,
        hasAirport: initial?.hasAirport ?? false,
        isActive,
        sortOrder: Number(sortOrder) || 0,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={MapPin}
      title={initial ? initial.nameFa || t('cities.edit') : t('cities.create')}
      subtitle={initial ? undefined : t('cities.createSubtitle')}
    >
    <AppForm onSubmit={submit} className={formCardBodyClassName}>
      <FormField icon={Flag} label={t('geo.country')} htmlFor="countryId">
        <SearchSelect
          id="countryId"
          value={countryId}
          required
          placeholder={t('geo.selectCountry')}
          onChange={(next) => {
            onCountryChange(next)
            setProvinceId('')
          }}
          options={[
            { value: '', label: t('geo.selectCountry') },
            ...countries.map((country) => ({
              value: country.id,
              label: name(country),
            })),
          ]}
        />
      </FormField>
      <FormField icon={MapPinned} label={t('geo.province')} htmlFor="provinceId">
        <SearchSelect
          id="provinceId"
          value={provinceId}
          required
          disabled={!countryId}
          placeholder={t('geo.selectProvince')}
          onChange={setProvinceId}
          options={[
            { value: '', label: t('geo.selectProvince') },
            ...provinces.map((province) => ({
              value: province.id,
              label: name(province),
            })),
          ]}
        />
      </FormField>
      <FormField icon={Type} label={t('geo.nameFa')} htmlFor="nameFa">
        <input
          id="nameFa"
          className={fieldClassName}
          value={nameFa}
          onChange={(e) => setNameFa(e.target.value)}
          required
          minLength={2}
        />
      </FormField>
      <FormField icon={Languages} label={t('geo.nameEn')} htmlFor="nameEn">
        <input
          id="nameEn"
          className={fieldClassName}
          value={nameEn}
          onChange={(e) => {
            setNameEn(e.target.value)
            if (!codeTouched) {
              setCode(slugifyCode(e.target.value))
            }
          }}
          required
          minLength={2}
        />
      </FormField>
      <FormField icon={MapPin} label={t('geo.code')} htmlFor="code">
        <input
          id="code"
          className={fieldClassName}
          value={code}
          onChange={(e) => {
            setCodeTouched(true)
            setCode(e.target.value)
          }}
          required
        />
      </FormField>
      <FormField icon={Navigation} label={t('geo.neshanAddress')} htmlFor="neshanAddress">
        <input
          id="neshanAddress"
          className={fieldClassName}
          value={neshanAddress}
          onChange={(e) => setNeshanAddress(e.target.value)}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField icon={Compass} label={t('geo.latitude')} htmlFor="latitude">
          <input
            id="latitude"
            type="number"
            step="any"
            className={fieldClassName}
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
        </FormField>
        <FormField icon={Compass} label={t('geo.longitude')} htmlFor="longitude">
          <input
            id="longitude"
            type="number"
            step="any"
            className={fieldClassName}
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </FormField>
      </div>
      <FormField icon={Hash} label={t('geo.sortOrder')} htmlFor="sortOrder">
        <input
          id="sortOrder"
          type="number"
          min={0}
          className={fieldClassName}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </FormField>
      <FormField icon={Landmark} label={t('geo.isProvinceCapital')} htmlFor="isProvinceCapital">
        <ToggleField
          id="isProvinceCapital"
          checked={isProvinceCapital}
          onChange={setIsProvinceCapital}
          onLabel={t('common.yes')}
          offLabel={t('common.no')}
        />
      </FormField>
      {initial ? (
        <FormField icon={ToggleRight} label={t('geo.isActive')} htmlFor="isActive">
          <ToggleField
            id="isActive"
            checked={isActive}
            onChange={setIsActive}
            onLabel={t('geo.active')}
            offLabel={t('geo.inactive')}
          />
        </FormField>
      ) : null}
      <FormActions
        submitLabel={t('cities.save')}
        cancelLabel={t('cities.cancel')}
        submitting={saving}
        onCancel={() => history.back()}
      />
    </AppForm>
    </FormCard>
  )
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function toOptionalNumber(value: string) {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
