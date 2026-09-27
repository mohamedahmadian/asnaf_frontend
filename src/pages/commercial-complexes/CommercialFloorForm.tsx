import { FileText, Hash, Layers, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'

export type CommercialFloorPayload = {
  title: string
  description?: string | null
  code: string
}

export function CommercialFloorForm({
  initial,
  onSubmit,
}: {
  initial?: CommercialFloorPayload
  onSubmit: (payload: CommercialFloorPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        code: code.trim(),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Layers}
      title={initial ? initial.title : t('commercialFloors.create')}
      subtitle={initial ? undefined : t('commercialFloors.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('commercialFloors.titleLabel')} htmlFor="title">
          <input
            id="title"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={1}
            maxLength={120}
          />
        </FormField>
        <FormField icon={Hash} label={t('commercialFloors.code')} htmlFor="code">
          <input
            id="code"
            className={`${fieldClassName} digit-field`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            minLength={1}
            maxLength={32}
          />
        </FormField>
        <FormField icon={FileText} label={t('commercialFloors.description')} htmlFor="description">
          <textarea
            id="description"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </FormField>
        <FormActions
          submitLabel={t('commercialFloors.save')}
          cancelLabel={t('commercialFloors.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
