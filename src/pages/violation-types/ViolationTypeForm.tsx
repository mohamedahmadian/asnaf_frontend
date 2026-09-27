import { FileText, ShieldAlert, ToggleRight, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'

export type ViolationTypePayload = {
  title: string
  description?: string | null
  isActive: boolean
}

export function ViolationTypeForm({
  initial,
  onSubmit,
}: {
  initial?: ViolationTypePayload
  onSubmit: (payload: ViolationTypePayload) => Promise<void>
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
      icon={ShieldAlert}
      title={initial ? initial.title : t('violationTypes.create')}
      subtitle={initial ? undefined : t('violationTypes.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('violationTypes.title')} htmlFor="violationTypeTitle">
          <input
            id="violationTypeTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={FileText} label={t('violationTypes.description')} htmlFor="violationTypeDescription">
          <textarea
            id="violationTypeDescription"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('violationTypes.isActive')} htmlFor="violationTypeActive">
            <ToggleField
              id="violationTypeActive"
              checked={isActive}
              onChange={setIsActive}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        ) : null}
        <FormActions
          submitLabel={t('violationTypes.save')}
          cancelLabel={t('violationTypes.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
