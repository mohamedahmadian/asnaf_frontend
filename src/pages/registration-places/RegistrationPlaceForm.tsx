import { FileText, MapPinned, ToggleRight, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'

export type RegistrationPlacePayload = {
  title: string
  description?: string | null
  isActive: boolean
}

export function RegistrationPlaceForm({
  initial,
  onSubmit,
}: {
  initial?: RegistrationPlacePayload
  onSubmit: (payload: RegistrationPlacePayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
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
      icon={MapPinned}
      title={initial ? initial.title : t('registrationPlaces.create')}
      subtitle={initial ? undefined : t('registrationPlaces.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('registrationPlaces.title')} htmlFor="registrationPlaceTitle">
          <input
            id="registrationPlaceTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={FileText} label={t('registrationPlaces.description')} htmlFor="registrationPlaceDescription">
          <textarea
            id="registrationPlaceDescription"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        <FormField icon={ToggleRight} label={t('registrationPlaces.isActive')} htmlFor="registrationPlaceActive">
          <ToggleField
            id="registrationPlaceActive"
            checked={isActive}
            onChange={setIsActive}
            onLabel={t('geo.active')}
            offLabel={t('geo.inactive')}
          />
        </FormField>
        <FormActions
          submitLabel={t('registrationPlaces.save')}
          cancelLabel={t('registrationPlaces.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
