import { FileText, Hash, Rows3, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'

export type CommercialLanePayload = {
  title: string
  description?: string | null
  code: string
}

export function CommercialLaneForm({
  initial,
  onSubmit,
}: {
  initial?: CommercialLanePayload
  onSubmit: (payload: CommercialLanePayload) => Promise<void>
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
      icon={Rows3}
      title={initial ? initial.title : t('commercialLanes.create')}
      subtitle={initial ? undefined : t('commercialLanes.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('commercialLanes.titleLabel')} htmlFor="title">
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
        <FormField icon={Hash} label={t('commercialLanes.code')} htmlFor="code">
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
        <FormField icon={FileText} label={t('commercialLanes.description')} htmlFor="description">
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
          submitLabel={t('commercialLanes.save')}
          cancelLabel={t('commercialLanes.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
