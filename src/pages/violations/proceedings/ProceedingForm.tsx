import { CalendarDays, ClipboardList, FileText, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import {
  AppForm,
  FormActions,
  FormField,
  fieldClassName,
} from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'
import type { ViolationAttachment } from '../../../types/app'
import { AttachmentField } from '../AttachmentField'

export type ProceedingFormValue = {
  occurredAt: string
  title: string
  description: string
  attachments?: ViolationAttachment[]
}

export function ProceedingForm({
  initial,
  onSubmit,
}: {
  initial?: ProceedingFormValue
  onSubmit: (payload: {
    occurredAt: string
    title: string
    description: string | null
    files: File[]
    removeAttachmentIds: string[]
  }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!occurredAt || title.trim().length < 2) {
      toast.error(t('violations.requiredFields'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        occurredAt,
        title: title.trim(),
        description: description.trim() || null,
        files,
        removeAttachmentIds: removedIds,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={ClipboardList}
      title={initial ? initial.title : t('violationProceedings.create')}
      subtitle={initial ? undefined : t('violationProceedings.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={CalendarDays} label={t('violationProceedings.occurredAt')} htmlFor="proceedingDate">
          <PersianDateField id="proceedingDate" value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
          <input className="sr-only" tabIndex={-1} value={occurredAt} required onChange={() => undefined} />
        </FormField>
        <FormField icon={Type} label={t('violationProceedings.titleField')} htmlFor="proceedingTitle">
          <input
            id="proceedingTitle"
            className={fieldClassName}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={2}
            maxLength={200}
          />
        </FormField>
        <FormField icon={FileText} label={t('violationProceedings.description')} htmlFor="proceedingDescription">
          <textarea
            id="proceedingDescription"
            className={fieldClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={4000}
          />
        </FormField>
        <FormField icon={FileText} label={t('violationProceedings.attachments')} htmlFor="proceedingFiles">
          <AttachmentField
            id="proceedingFiles"
            existing={initial?.attachments}
            removedIds={removedIds}
            onToggleRemove={(attachmentId) =>
              setRemovedIds((current) =>
                current.includes(attachmentId)
                  ? current.filter((item) => item !== attachmentId)
                  : [...current, attachmentId],
              )
            }
            files={files}
            onFilesChange={setFiles}
          />
        </FormField>
        <FormActions
          submitLabel={t('violationProceedings.save')}
          cancelLabel={t('violationProceedings.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
