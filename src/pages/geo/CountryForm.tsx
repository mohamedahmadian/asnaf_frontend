import { Flag, Globe2, Hash, Languages, Phone, ToggleRight, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormField, FormActions, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'

export type CountryPayload = {
  iso2: string
  iso3?: string
  phoneCode?: string
  nameFa: string
  nameEn: string
  isActive: boolean
  sortOrder: number
}

export function CountryForm({
  initial,
  onSubmit,
}: {
  initial?: CountryPayload
  onSubmit: (payload: CountryPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [iso2, setIso2] = useState(initial?.iso2 ?? '')
  const [iso3, setIso3] = useState(initial?.iso3 ?? '')
  const [phoneCode, setPhoneCode] = useState(initial?.phoneCode ?? '')
  const [nameFa, setNameFa] = useState(initial?.nameFa ?? '')
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0))
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        iso2: iso2.trim().toUpperCase(),
        iso3: iso3.trim().toUpperCase() || undefined,
        phoneCode: phoneCode.trim() || undefined,
        nameFa: nameFa.trim(),
        nameEn: nameEn.trim(),
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
      icon={Flag}
      title={initial ? initial.nameFa || t('countries.edit') : t('countries.create')}
      subtitle={initial ? undefined : t('countries.createSubtitle')}
    >
    <AppForm onSubmit={submit} className={formCardBodyClassName}>
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
          onChange={(e) => setNameEn(e.target.value)}
          required
          minLength={2}
        />
      </FormField>
      <FormField icon={Flag} label={t('geo.iso2')} htmlFor="iso2">
        <input
          id="iso2"
          className={fieldClassName}
          value={iso2}
          onChange={(e) => setIso2(e.target.value.toUpperCase())}
          required
          minLength={2}
          maxLength={2}
        />
      </FormField>
      <FormField icon={Globe2} label={t('geo.iso3')} htmlFor="iso3">
        <input
          id="iso3"
          className={fieldClassName}
          value={iso3}
          onChange={(e) => setIso3(e.target.value.toUpperCase())}
          maxLength={3}
        />
      </FormField>
      <FormField icon={Phone} label={t('geo.phoneCode')} htmlFor="phoneCode">
        <input
          id="phoneCode"
          className={fieldClassName}
          value={phoneCode}
          onChange={(e) => setPhoneCode(e.target.value)}
          placeholder="+98"
        />
      </FormField>
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
        submitLabel={t('countries.save')}
        cancelLabel={t('countries.cancel')}
        submitting={saving}
        onCancel={() => history.back()}
      />
    </AppForm>
    </FormCard>
  )
}
