import { FileText, Hash, Store, ToggleRight } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'

export type CommercialUnitPayload = {
  plaque: string
  description?: string | null
  code: string
  isActive: boolean
}

export function CommercialUnitForm({
  initial,
  onSubmit,
}: {
  initial?: CommercialUnitPayload
  onSubmit: (payload: CommercialUnitPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [plaque, setPlaque] = useState(initial?.plaque ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        plaque: plaque.trim(),
        description: description.trim() || null,
        code: code.trim(),
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
      icon={Store}
      title={initial ? initial.plaque : t('commercialUnits.create')}
      subtitle={initial ? undefined : t('commercialUnits.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Hash} label={t('commercialUnits.plaque')} htmlFor="plaque">
          <input
            id="plaque"
            className={`${fieldClassName} digit-field`}
            value={plaque}
            onChange={(e) => setPlaque(e.target.value)}
            required
            minLength={1}
            maxLength={32}
          />
        </FormField>
        <FormField icon={Hash} label={t('commercialUnits.code')} htmlFor="code">
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
        <FormField icon={FileText} label={t('commercialUnits.description')} htmlFor="description">
          <textarea
            id="description"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('commercialUnits.isActive')} htmlFor="isActive">
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
          submitLabel={t('commercialUnits.save')}
          cancelLabel={t('commercialUnits.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
