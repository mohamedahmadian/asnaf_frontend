import { useState } from 'react'
import { Check, FileText, Phone, Printer, RotateCcw, ScanSearch, UserRound, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, FormField, fieldClassName } from '../../components/ui/Form'
import { confirmToast } from '../../components/ui/confirmToast'
import { FileDropField } from '../../components/ui/FileDropField'
import { FormCard, FormEmptyHint, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { PLACES_FORMATION_STEP } from './formation-types'
import { openInquiryFile, submitInquiryDecision } from './inquiry-api'
import type { CaseInquiryRow } from './inquiry-types'

const frame: Record<CaseInquiryRow['status'], string> = {
  PENDING: 'border-amber-200 bg-amber-50/50',
  APPROVED: 'border-emerald-200 bg-emerald-50/50',
  REJECTED: 'border-red-200 bg-red-50/50',
}

export function CaseInquiriesStep({
  userId,
  items,
  loading,
  onAdvanced,
}: {
  userId: string
  items: CaseInquiryRow[]
  loading: boolean
  onAdvanced: (formationStep: number) => void
}) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const pending = items.some((item) => item.status === 'PENDING')

  const advance = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ formationStep: number }>('/cases/formation/step', {
        userId,
        step: PLACES_FORMATION_STEP,
      })
      return data.formationStep
    },
    onSuccess: (formationStep) => {
      toast.success(t('cases.inquiriesAdvanced'))
      onAdvanced(formationStep)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t('cases.saveFailed'))),
  })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['cases', 'formation-inquiries', userId] })
  }

  return (
    <FormCard
      icon={ScanSearch}
      title={t('cases.steps.inquiries')}
      action={
        <Button type="button" disabled={loading || pending || advance.isPending} onClick={() => advance.mutate()}>
          <Check className="size-4" aria-hidden />
          {t('cases.inquiriesContinue')}
        </Button>
      }
    >
      <div className={formCardBodyClassName}>
        <p className="text-sm text-ink-500">{t('cases.inquiriesHint')}</p>
        {loading ? <LoadingState variant="inline" /> : null}
        {!loading && items.length === 0 ? <FormEmptyHint>{t('cases.inquiriesEmpty')}</FormEmptyHint> : null}
        <div className="grid gap-4">
          {items.map((item) => (
            <InquiryCard key={item.id} item={item} locale={locale} onChanged={() => void refresh()} />
          ))}
        </div>
      </div>
    </FormCard>
  )
}

function InquiryCard({
  item,
  locale,
  onChanged,
}: {
  item: CaseInquiryRow
  locale: string
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState(item.note ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  async function decide(status: 'APPROVED' | 'REJECTED') {
    if (status === 'REJECTED' && !note.trim()) {
      toast.error(t('cases.inquiryRejectNote'))
      return
    }
    setSaving(true)
    try {
      await submitInquiryDecision(`/cases/formation/inquiries/${item.id}/decision`, status, note, file)
      toast.success(t('cases.inquiryDecided'))
      setFile(null)
      onChanged()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  async function reopen() {
    setSaving(true)
    try {
      await api.post(`/cases/formation/inquiries/${item.id}/reopen`)
      toast.success(t('cases.inquiryReopened'))
      setNote('')
      setFile(null)
      onChanged()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={`space-y-3 rounded-2xl border p-4 ${frame[item.status]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <FormSectionTitle icon={ScanSearch} className="mb-0">
          {item.center.name}
        </FormSectionTitle>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-teal-100">
          {t(`cases.inquiryStatuses.${item.status}`)}
          {item.channel ? ` · ${t(`cases.inquiryChannels.${item.channel}`)}` : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-ink-600">
        {item.center.phone ? (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-3.5 text-teal-600" aria-hidden />
            {localizeDigits(item.center.phone, locale)}
          </span>
        ) : null}
        {item.center.officerName ? (
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5 text-teal-600" aria-hidden />
            {item.center.officerName}
          </span>
        ) : (
          <span className="text-ink-400">{t('cases.inquiryNoOfficer')}</span>
        )}
      </div>
      <Link
        to={`/cases/formation/inquiries/${item.id}/letter`}
        target="_blank"
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-teal-700"
      >
        <Printer className="size-4" aria-hidden />
        {t('cases.inquiryLetter')}
      </Link>
      {item.status === 'PENDING' ? (
        <div className="space-y-3">
          <FormField icon={FileText} label={t('cases.inquiryNote')} htmlFor={`inquiry-note-${item.id}`}>
            <textarea
              id={`inquiry-note-${item.id}`}
              className={fieldClassName}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </FormField>
          <FormField icon={FileText} label={t('cases.inquiryAttachment')} htmlFor={`inquiry-file-${item.id}`}>
            <FileDropField
              id={`inquiry-file-${item.id}`}
              accept="image/*,application/pdf"
              allowCamera
              onFile={setFile}
              onClear={() => setFile(null)}
            />
          </FormField>
          <InquiryFiles files={item.files} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={saving} onClick={() => void decide('APPROVED')}>
              <Check className="size-4" aria-hidden />
              {t('cases.inquiryApprove')}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={saving}
              onClick={() =>
                confirmToast({
                  title: t('cases.inquiryRejectConfirm'),
                  confirmLabel: t('cases.inquiryReject'),
                  cancelLabel: t('common.cancel'),
                  confirmVariant: 'danger',
                  onConfirm: () => void decide('REJECTED'),
                })
              }
            >
              <X className="size-4" aria-hidden />
              {t('cases.inquiryReject')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {item.note ? <p className="text-sm whitespace-pre-wrap text-ink-800">{item.note}</p> : null}
          {item.decidedBy ? (
            <p className="text-xs text-ink-500">
              {item.decidedBy.fullName}
            </p>
          ) : null}
          <InquiryFiles files={item.files} />
          <Button type="button" variant="ghost" disabled={saving} onClick={() => void reopen()}>
            <RotateCcw className="size-4" aria-hidden />
            {t('cases.inquiryReopen')}
          </Button>
        </div>
      )}
    </article>
  )
}

function InquiryFiles({ files }: { files: CaseInquiryRow['files'] }) {
  if (!files.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          className="cursor-pointer text-sm text-teal-700"
          onClick={() => void openInquiryFile(file.id)}
        >
          {file.originalName || file.id}
        </button>
      ))}
    </div>
  )
}
