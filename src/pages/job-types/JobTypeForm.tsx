import { Banknote, Briefcase, FileText, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AmountInput } from '../../components/ui/AmountInput'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'
import { parseGroupedAmount } from '../../lib/datetime'

export type JobTypePayload = {
  title: string
  description?: string | null
  annualFee?: number | null
}

export function JobTypeForm({
  initial,
  embedded = false,
  onSubmit,
}: {
  initial?: JobTypePayload
  embedded?: boolean
  onSubmit: (payload: JobTypePayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [annualFee, setAnnualFee] = useState(
    initial?.annualFee != null ? String(initial.annualFee) : '',
  )
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        annualFee: parseGroupedAmount(annualFee),
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
        <FormField icon={Type} label={t('jobTypes.title')} htmlFor="jobTypeTitle">
          <input
            id="jobTypeTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={Banknote} label={t('jobTypes.annualFee')} htmlFor="jobTypeAnnualFee">
          <AmountInput id="jobTypeAnnualFee" value={annualFee} onChange={setAnnualFee} />
          <p className="text-xs text-ink-500">{t('jobTypes.annualFeeHint')}</p>
        </FormField>
        <FormField icon={FileText} label={t('jobTypes.description')} htmlFor="jobTypeDescription">
          <textarea
            id="jobTypeDescription"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        </div>
        <FormActions
          submitLabel={t('jobTypes.save')}
          cancelLabel={t('jobTypes.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
  )

  if (embedded) return form

  return (
    <FormCard
      icon={Briefcase}
      title={initial ? initial.title : t('jobTypes.create')}
      subtitle={initial ? undefined : t('jobTypes.createSubtitle')}
    >
      {form}
    </FormCard>
  )
}
