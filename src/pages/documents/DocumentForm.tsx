import { FileCheck, Lock, ToggleRight, Type, Users } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../lib/api'
import { documentGenders, type DocumentGender } from '../../types/app'

export type DocumentPayload = {
  title: string
  isRequired: boolean
  gender: DocumentGender
  isFixed: boolean
}

export function DocumentForm({
  initial,
  onSubmit,
}: {
  initial?: DocumentPayload
  onSubmit: (payload: DocumentPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [isRequired, setIsRequired] = useState(initial?.isRequired ?? true)
  const [gender, setGender] = useState(initial?.gender ?? documentGenders.BOTH)
  const [isFixed, setIsFixed] = useState(initial?.isFixed ?? false)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        isRequired,
        gender,
        isFixed,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={FileCheck}
      title={initial ? initial.title : t('documents.create')}
      subtitle={initial ? undefined : t('documents.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('documents.title')} htmlFor="documentTitle">
          <input
            id="documentTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={ToggleRight} label={t('documents.isRequired')} htmlFor="documentRequired">
          <ToggleField
            id="documentRequired"
            checked={isRequired}
            onChange={setIsRequired}
            onLabel={t('documents.required')}
            offLabel={t('documents.optional')}
          />
        </FormField>
        <FormField icon={Users} label={t('documents.gender')} htmlFor="documentGender">
          <SearchSelect
            id="documentGender"
            value={gender}
            onChange={(next) => setGender(next as DocumentGender)}
            placeholder={t('documents.selectGender')}
            required
            options={Object.values(documentGenders).map((item) => ({
              value: item,
              label: t(`documents.genders.${item}`),
            }))}
          />
        </FormField>
        <FormField icon={Lock} label={t('documents.isFixed')} htmlFor="documentFixed">
          <ToggleField
            id="documentFixed"
            checked={isFixed}
            onChange={setIsFixed}
            onLabel={t('documents.fixed')}
            offLabel={t('documents.notFixed')}
          />
        </FormField>
        <FormActions
          submitLabel={t('documents.save')}
          cancelLabel={t('documents.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
