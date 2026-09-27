import { Building2, Languages, Mailbox, MapPin, ToggleRight, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'

export type CommercialComplexPayload = {
  name: string
  nameEn: string
  address?: string | null
  postalCode?: string | null
  isActive: boolean
}

export function CommercialComplexForm({
  initial,
  onSubmit,
}: {
  initial?: CommercialComplexPayload
  onSubmit: (payload: CommercialComplexPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        nameEn: nameEn.trim(),
        address: address.trim() || null,
        postalCode: postalCode.trim() || null,
        isActive,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Building2}
      title={initial ? initial.name : t('commercialComplexes.create')}
      subtitle={initial ? undefined : t('commercialComplexes.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('commercialComplexes.name')} htmlFor="name">
          <input
            id="name"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
          />
        </FormField>
        <FormField icon={Languages} label={t('commercialComplexes.nameEn')} htmlFor="nameEn">
          <input
            id="nameEn"
            className={fieldClassName}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            required
            minLength={2}
            maxLength={120}
          />
        </FormField>
        <FormField icon={MapPin} label={t('commercialComplexes.address')} htmlFor="address">
          <textarea
            id="address"
            className={fieldClassName}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </FormField>
        <FormField icon={Mailbox} label={t('commercialComplexes.postalCode')} htmlFor="postalCode">
          <input
            id="postalCode"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            maxLength={20}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('commercialComplexes.isActive')} htmlFor="isActive">
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
          submitLabel={t('commercialComplexes.save')}
          cancelLabel={t('commercialComplexes.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
