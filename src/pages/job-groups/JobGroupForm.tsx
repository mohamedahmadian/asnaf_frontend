import { FileText, FolderKanban, Hash, Languages, ToggleRight, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'

export type JobGroupPayload = {
  title: string
  titleEn?: string | null
  description?: string | null
  code?: string | null
  isActive: boolean
}

export function JobGroupForm({
  initial,
  embedded = false,
  onSubmit,
}: {
  initial?: JobGroupPayload
  embedded?: boolean
  onSubmit: (payload: JobGroupPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        titleEn: titleEn.trim() || null,
        description: description.trim() || null,
        code: code.trim() || null,
        isActive,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const form = (
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <div
          role={embedded ? 'tabpanel' : undefined}
          id={embedded ? 'form-panel-info' : undefined}
          aria-labelledby={embedded ? 'form-tab-info' : undefined}
          className="space-y-4"
        >
        <FormField icon={Type} label={t('jobGroups.title')} htmlFor="jobGroupTitle">
          <input
            id="jobGroupTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={Languages} label={t('jobGroups.titleEn')} htmlFor="jobGroupTitleEn">
          <input
            id="jobGroupTitleEn"
            className={fieldClassName}
            dir="ltr"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={Hash} label={t('jobGroups.code')} htmlFor="jobGroupCode">
          <input
            id="jobGroupCode"
            className={`${fieldClassName} digit-field`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={32}
          />
        </FormField>
        <FormField icon={FileText} label={t('jobGroups.description')} htmlFor="jobGroupDescription">
          <textarea
            id="jobGroupDescription"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('jobGroups.isActive')} htmlFor="jobGroupActive">
            <ToggleField
              id="jobGroupActive"
              checked={isActive}
              onChange={setIsActive}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        ) : null}
        </div>
        <FormActions
          submitLabel={t('jobGroups.save')}
          cancelLabel={t('jobGroups.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
  )

  if (embedded) return form

  return (
    <FormCard
      icon={FolderKanban}
      title={initial ? initial.title : t('jobGroups.create')}
      subtitle={initial ? undefined : t('jobGroups.createSubtitle')}
    >
      {form}
    </FormCard>
  )
}
