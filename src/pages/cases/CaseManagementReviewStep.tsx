import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Building2, Check, Clock, FileText, Paperclip, RotateCcw, Shield, ShieldCheck, Type, UserRound, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, FormField, fieldClassName } from '../../components/ui/Form'
import { confirmToast } from '../../components/ui/confirmToast'
import { DateText } from '../../components/ui/DateText'
import { FileDropField } from '../../components/ui/FileDropField'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { ISSUANCE_FORMATION_STEP } from './formation-types'
import { InquiryProgressChart } from './CaseInquiriesStep'
import { openInquiryFile, submitInquiryDecision } from './inquiry-api'
import type { CaseInquiryChannel, CaseInquiryFile, CaseInquiryStatus } from './inquiry-types'

const frame: Record<CaseInquiryStatus, string> = {
  PENDING: 'border-[#f6e4e7] bg-[#fff7f8]',
  APPROVED: 'border-emerald-200 bg-emerald-50/50',
  REJECTED: 'border-red-200 bg-red-50/50',
}

const decisionButtonClassName = 'min-w-40 px-8 disabled:opacity-60'
const filesPath = '/cases/formation/management-reviews/files'

export type CaseManagementApproverRow = {
  id: string
  status: CaseInquiryStatus
  channel: CaseInquiryChannel | null
  note: string | null
  createdAt: string
  decidedAt: string | null
  decidedBy: { id: string; fullName: string } | null
  workUnitTitle: string | null
  roleName: string
  displayTitle?: string | null
  people: { id: string; fullName: string }[]
  files: CaseInquiryFile[]
}

export function CaseManagementReviewStep({
  caseId,
  items,
  loading,
  autoAdvance,
  showAdvance = true,
  headerAction,
  onAdvanced,
  onRewound,
  onChanged,
}: {
  caseId: string
  items: CaseManagementApproverRow[]
  loading: boolean
  autoAdvance: boolean
  /** در تمدید و تغییر مکان، ادامه را صفحهٔ فرایند می‌زند */
  showAdvance?: boolean
  headerAction?: ReactNode
  onAdvanced: (formationStep: number) => void
  onRewound: () => void
  onChanged?: () => void
}) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const pending = items.some((item) => item.status === 'PENDING')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeId = items.some((item) => item.id === selectedId) ? selectedId : (items[0]?.id ?? '')
  const autoAdvanceStarted = useRef(false)
  const sawPending = useRef(false)
  const doneCount = items.filter((item) => item.status !== 'PENDING').length

  const advance = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ formationStep: number }>('/cases/formation/step', {
        caseId,
        step: ISSUANCE_FORMATION_STEP,
      })
      return data.formationStep
    },
    onSuccess: (formationStep) => {
      toast.success(t('cases.managementAdvanced'))
      onAdvanced(formationStep)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t('cases.saveFailed'))),
  })

  useEffect(() => {
    if (!loading && pending) sawPending.current = true
  }, [loading, pending])

  useEffect(() => {
    if (!autoAdvance || loading) return
    if (pending || items.length === 0) {
      autoAdvanceStarted.current = false
      return
    }
    if (!sawPending.current || autoAdvanceStarted.current || advance.isPending) return
    autoAdvanceStarted.current = true
    advance.mutate()
  }, [advance, autoAdvance, items.length, loading, pending])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['cases', 'formation-management-approvers', caseId] })
    onChanged?.()
  }

  const tabs = items.map((item) => ({
    id: item.id,
    label: item.displayTitle || [item.workUnitTitle, item.roleName].filter(Boolean).join(' · '),
    approved: item.status === 'APPROVED',
    pending: item.status === 'PENDING',
  }))

  return (
    <FormCard
      icon={ShieldCheck}
      title={t('cases.steps.managementReview')}
      subtitle={items.length > 0 ? t('cases.managementApproversHint') : undefined}
      titleExtra={
        items.length > 0 ? <InquiryProgressChart done={doneCount} total={items.length} locale={locale} /> : null
      }
      action={
        headerAction ??
        (showAdvance ? (
        <Button type="button" disabled={loading || pending || advance.isPending} onClick={() => advance.mutate()}>
          <Check className="size-4" aria-hidden />
          {t('cases.managementContinue')}
        </Button>
        ) : undefined)
      }
    >
      {loading ? (
        <div className={formCardBodyClassName}>
          <LoadingState variant="inline" />
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className={formCardBodyClassName}>
          <FormEmptyHint>{t('cases.managementApproversEmpty')}</FormEmptyHint>
        </div>
      ) : null}
      {items.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <FormTabs tabs={tabs} value={activeId ?? ''} onChange={setSelectedId} />
          </div>
          <div className={formCardBodyClassName}>
            {items.map((item) => (
              <div
                key={item.id}
                id={`form-panel-${item.id}`}
                role="tabpanel"
                aria-labelledby={`form-tab-${item.id}`}
                hidden={item.id !== activeId}
              >
                <ReviewCard item={item} locale={locale} onChanged={() => void refresh()} onRewound={onRewound} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </FormCard>
  )
}

function ReviewCard({
  item,
  locale,
  onChanged,
  onRewound,
}: {
  item: CaseManagementApproverRow
  locale: string
  onChanged: () => void
  onRewound: () => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState(item.note ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const label = item.displayTitle || [item.workUnitTitle, item.roleName].filter(Boolean).join(' · ')

  async function decide(status: 'APPROVED' | 'REJECTED') {
    if (status === 'REJECTED' && !note.trim()) {
      toast.error(t('cases.managementRejectNote'))
      return
    }
    setSaving(true)
    try {
      await submitInquiryDecision(`/cases/formation/management-reviews/${item.id}/decision`, status, note, file)
      toast.success(t('cases.managementDecided'))
      setFile(null)
      setAttachmentOpen(false)
      onChanged()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  function askReopen() {
    confirmToast({
      title: t('cases.managementReopenConfirm'),
      confirmLabel: t('cases.managementReopen'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => void reopen(),
    })
  }

  async function reopen() {
    setSaving(true)
    try {
      await api.post(`/cases/formation/management-reviews/${item.id}/reopen`)
      toast.success(t('cases.managementReopened'))
      setNote('')
      setFile(null)
      setAttachmentOpen(false)
      onChanged()
      onRewound()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={`space-y-4 rounded-2xl border p-4 ${frame[item.status]}`}>
      <span className="inline-flex items-center gap-2 text-sm text-ink-700">
        <Clock className="size-4 text-teal-600" aria-hidden />
        <span className="font-medium">{t('cases.inquiryStatus')} :</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-teal-100">
          {t(`cases.inquiryStatuses.${item.status}`)}
          {item.channel ? ` · ${t(`cases.inquiryChannels.${item.channel}`)}` : ''}
        </span>
      </span>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        {item.displayTitle ? (
          <FormFactTile icon={Type} label={t('cases.settingsProcessManagementTitle')} value={item.displayTitle} tone="teal" className="sm:col-span-2" />
        ) : null}
        {item.workUnitTitle ? (
          <FormFactTile icon={Building2} label={t('cases.settingsManagementUnit')} value={item.workUnitTitle} tone="teal" />
        ) : null}
        <FormFactTile icon={Shield} label={t('cases.settingsManagementRole')} value={item.roleName} tone="mint" />
      </div>
      <FormSectionTitle icon={UserRound}>
        {t('cases.managementApproversPeople')}
        {item.people.length > 0 ? ` (${formatNumber(item.people.length, locale)})` : ''}
      </FormSectionTitle>
      {item.people.length === 0 ? (
        <FormEmptyHint>{t('cases.managementApproversNoPeople')}</FormEmptyHint>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {item.people.map((person) => (
            <li
              key={person.id}
              className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-teal-100 bg-white px-3 py-2 text-sm text-ink-800"
            >
              <UserRound className="size-4 shrink-0 text-teal-600" aria-hidden />
              <span className="truncate">{person.fullName}</span>
            </li>
          ))}
        </ul>
      )}
      {item.status === 'PENDING' ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor={`management-note-${item.id}`} className="flex items-center gap-2 text-sm font-medium text-ink-900">
                <FileText className="size-4 text-teal-600" aria-hidden />
                {t('cases.inquiryNote')}
              </label>
              <Button type="button" variant="ghost" onClick={() => setAttachmentOpen((open) => !open)}>
                <Paperclip className="size-4" aria-hidden />
                {t('cases.managementAddAttachment')}
              </Button>
            </div>
            <textarea
              id={`management-note-${item.id}`}
              className={fieldClassName}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          {attachmentOpen ? (
            <FormField icon={Paperclip} label={t('cases.inquiryAttachment')} htmlFor={`management-file-${item.id}`}>
              <FileDropField
                id={`management-file-${item.id}`}
                accept="image/*,application/pdf"
                allowCamera
                onFile={setFile}
                onClear={() => setFile(null)}
              />
            </FormField>
          ) : null}
          <ReviewFiles files={item.files} />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              className={decisionButtonClassName}
              disabled={saving}
              onClick={() =>
                confirmToast({
                  title: t('cases.managementApproveConfirm', { name: label }),
                  confirmLabel: t('cases.inquiryApprove'),
                  cancelLabel: t('common.cancel'),
                  onConfirm: () => void decide('APPROVED'),
                })
              }
            >
              <Check className="size-4" aria-hidden />
              {t('cases.inquiryApprove')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={decisionButtonClassName}
              disabled={saving}
              onClick={() =>
                confirmToast({
                  title: t('cases.managementRejectConfirm'),
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
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {item.decidedAt ? (
              <FormFactTile icon={Clock} label={t('cases.inquiryDecidedAt')} value={<DateText value={item.decidedAt} withTime />} tone="mint" />
            ) : null}
            {item.decidedBy ? (
              <FormFactTile icon={UserRound} label={t('cases.inquiryDecidedBy')} value={item.decidedBy.fullName} tone="teal" />
            ) : null}
            {item.note ? (
              <FormFactTile icon={FileText} label={t('cases.inquiryNote')} value={item.note} tone="ink" className="sm:col-span-2" />
            ) : null}
          </div>
          <ReviewFiles files={item.files} />
          <div className="flex justify-end">
            <Button type="button" variant="ghost" disabled={saving} onClick={askReopen}>
              <RotateCcw className="size-4" aria-hidden />
              {t('cases.managementReopen')}
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}

function ReviewFiles({ files }: { files: CaseInquiryFile[] }) {
  if (!files.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          className="cursor-pointer text-sm text-teal-700"
          onClick={() => void openInquiryFile(file.id, filesPath)}
        >
          {file.originalName || file.id}
        </button>
      ))}
    </div>
  )
}
