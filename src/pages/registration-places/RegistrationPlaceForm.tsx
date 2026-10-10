import { FileText, MapPinned, Star, ToggleRight, Type } from 'lucide-react'
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
  isDefault: boolean
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
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        isActive,
        isDefault: isDefault && isActive,
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
        <div className="grid grid-cols-2 gap-4">
          <FormField icon={Star} label={t('registrationPlaces.isDefault')} htmlFor="registrationPlaceDefault">
            <ToggleField
              id="registrationPlaceDefault"
              checked={isDefault}
              onChange={(next) => {
                setIsDefault(next)
                if (next) setIsActive(true)
              }}
              onLabel={t('common.yes')}
              offLabel={t('common.no')}
            />
          </FormField>
          <FormField icon={ToggleRight} label={t('registrationPlaces.isActive')} htmlFor="registrationPlaceActive">
            <ToggleField
              id="registrationPlaceActive"
              checked={isActive}
              onChange={(next) => {
                setIsActive(next)
                if (!next) setIsDefault(false)
              }}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        </div>
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
