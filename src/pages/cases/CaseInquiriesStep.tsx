import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarCheck, Check, Clock, Download, FileText, Paperclip, Phone, Printer, Radio, RotateCcw, ScanSearch, UserRound, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, FormField, fieldClassName } from '../../components/ui/Form'
import { confirmToast } from '../../components/ui/confirmToast'
import { FileDropField } from '../../components/ui/FileDropField'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormEmptyHint, FormFactTile, formCardBodyClassName } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { PLACES_FORMATION_STEP } from './formation-types'
import {
  downloadInquiryLetter,
  inquiryLetterFilename,
  openInquiryFile,
  presentInquiryLetter,
  printInquiryLetter,
  submitInquiryDecision,
} from './inquiry-api'
import type { CaseInquiryLetter, CaseInquiryRow } from './inquiry-types'

const frame: Record<CaseInquiryRow['status'], string> = {
  PENDING: 'border-[#f6e4e7] bg-[#fff7f8]',
  APPROVED: 'border-emerald-200 bg-emerald-50/50',
  REJECTED: 'border-red-200 bg-red-50/50',
}

const decisionButtonClassName = 'min-w-40 px-8 disabled:opacity-60'

export function CaseInquiriesStep({
  userId,
  items,
  loading,
  autoAdvance,
  onAdvanced,
}: {
  userId: string
  items: CaseInquiryRow[]
  loading: boolean
  autoAdvance: boolean
  onAdvanced: (formationStep: number) => void
}) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const pending = items.some((item) => item.status === 'PENDING')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [printId, setPrintId] = useState<string | null>(null)
  const activeId = items.some((item) => item.id === selectedId) ? selectedId : (items[0]?.id ?? '')
  const autoAdvanceStarted = useRef(false)

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

  useEffect(() => {
    if (!autoAdvance || loading) return
    if (pending || items.length === 0) {
      autoAdvanceStarted.current = false
      return
    }
    if (autoAdvanceStarted.current || advance.isPending) return
    autoAdvanceStarted.current = true
    advance.mutate()
  }, [advance, autoAdvance, items.length, loading, pending])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['cases', 'formation-inquiries', userId] })
  }

  const doneCount = items.filter((item) => item.status !== 'PENDING').length
  const tabs = items.map((item) => ({
    id: item.id,
    label: item.center.name,
    approved: item.status === 'APPROVED',
    pending: item.status === 'PENDING',
  }))

  return (
    <FormCard
      icon={ScanSearch}
      title={t('cases.steps.inquiries')}
      titleExtra={
        items.length > 0 ? (
          <InquiryProgressChart done={doneCount} total={items.length} locale={locale} />
        ) : null
      }
      action={
        <Button type="button" disabled={loading || pending || advance.isPending} onClick={() => advance.mutate()}>
          <Check className="size-4" aria-hidden />
          {t('cases.inquiriesContinue')}
        </Button>
      }
    >
      {loading ? (
        <div className={formCardBodyClassName}>
          <LoadingState variant="inline" />
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className={formCardBodyClassName}>
          <FormEmptyHint>{t('cases.inquiriesEmpty')}</FormEmptyHint>
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
                <InquiryCard
                  item={item}
                  locale={locale}
                  onChanged={() => void refresh()}
                  onPrint={() => setPrintId(item.id)}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
      {printId ? (
        <InquiryLetterModal inquiryId={printId} locale={locale} onClose={() => setPrintId(null)} />
      ) : null}
    </FormCard>
  )
}

function InquiryProgressChart({ done, total, locale }: { done: number; total: number; locale: string }) {
  const { t } = useTranslation()
  const label = t('cases.inquiryProgress', {
    done: formatNumber(done, locale),
    total: formatNumber(total, locale),
  })
  const size = 36
  const radius = 16
  const center = size / 2
  const doneSweep = total === 0 ? 0 : (done / total) * Math.PI * 2

  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {done <= 0 || total === 0 ? (
          <circle cx={center} cy={center} r={radius} fill="#d9f3ef" />
        ) : done >= total ? (
          <circle cx={center} cy={center} r={radius} fill="#10b981" />
        ) : (
          <>
            <path d={pieSlice(center, center, radius, -Math.PI / 2, -Math.PI / 2 + doneSweep)} fill="#10b981" />
            <path
              d={pieSlice(center, center, radius, -Math.PI / 2 + doneSweep, -Math.PI / 2 + Math.PI * 2)}
              fill="#d9f3ef"
            />
          </>
        )}
      </svg>
      <span className="text-xs font-medium text-ink-600">{label}</span>
    </span>
  )
}

function pieSlice(cx: number, cy: number, radius: number, start: number, end: number) {
  const point = (angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  })
  const from = point(start)
  const to = point(end)
  const large = end - start > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${from.x} ${from.y} A ${radius} ${radius} 0 ${large} 1 ${to.x} ${to.y} Z`
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS
const MONTH_MS = 30 * DAY_MS

function inquiryElapsedLabel(
  fromIso: string,
  toIso: string,
  t: (key: string, options?: Record<string, string>) => string,
  locale: string,
) {
  const elapsed = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime())
  const n = (value: number) => formatNumber(value, locale)
  if (elapsed < MINUTE_MS) return t('cases.inquiryElapsedUnderMinute')
  if (elapsed < DAY_MS) {
    const hours = Math.floor(elapsed / HOUR_MS)
    const minutes = Math.floor((elapsed % HOUR_MS) / MINUTE_MS)
    if (hours === 0) return t('cases.inquiryElapsedMinute', { count: n(minutes) })
    if (minutes === 0) return t('cases.inquiryElapsedHour', { count: n(hours) })
    return t('cases.inquiryElapsedHourMinute', { hours: n(hours), minutes: n(minutes) })
  }
  if (elapsed < WEEK_MS) {
    const days = Math.floor(elapsed / DAY_MS)
    const hours = Math.floor((elapsed % DAY_MS) / HOUR_MS)
    if (hours === 0) return t('cases.inquiryElapsedDay', { count: n(days) })
    return t('cases.inquiryElapsedDayHour', { days: n(days), hours: n(hours) })
  }
  if (elapsed < MONTH_MS) {
    return t('cases.inquiryElapsedDay', { count: n(Math.floor(elapsed / DAY_MS)) })
  }
  const weeks = Math.floor(elapsed / WEEK_MS)
  const days = Math.floor((elapsed % WEEK_MS) / DAY_MS)
  if (days === 0) return t('cases.inquiryElapsedWeek', { count: n(weeks) })
  return t('cases.inquiryElapsedWeekDay', { weeks: n(weeks), days: n(days) })
}

function InquiryCard({
  item,
  locale,
  onChanged,
  onPrint,
}: {
  item: CaseInquiryRow
  locale: string
  onChanged: () => void
  onPrint: () => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState(item.note ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

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
      title: t('cases.inquiryReopenConfirm'),
      confirmLabel: t('cases.inquiryReopen'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => void reopen(),
    })
  }

  async function reopen() {
    setSaving(true)
    try {
      await api.post(`/cases/formation/inquiries/${item.id}/reopen`)
      toast.success(t('cases.inquiryReopened'))
      setNote('')
      setFile(null)
      setAttachmentOpen(false)
      onChanged()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  async function download() {
    setDownloading(true)
    try {
      const { data } = await api.get<CaseInquiryLetter>(`/cases/inquiries/${item.id}/letter`)
      const filled = presentInquiryLetter(data, locale)
      downloadInquiryLetter(inquiryLetterFilename(data.centerName), filled.title, filled.body)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article className={`space-y-3 rounded-2xl border p-4 ${frame[item.status]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm text-ink-700">
          <span className="font-medium">{t('cases.inquiryStatus')} :</span>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-teal-100">
            {t(`cases.inquiryStatuses.${item.status}`)}
            {item.channel ? ` · ${t(`cases.inquiryChannels.${item.channel}`)}` : ''}
          </span>
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            className="min-w-32 disabled:opacity-60"
            disabled={downloading}
            onClick={() => void download()}
          >
            <Download className="size-4" aria-hidden />
            {t('cases.inquiryDownload')}
          </Button>
          <Button type="button" variant="ghost" className="min-w-32" onClick={onPrint}>
            <Printer className="size-4" aria-hidden />
            {t('cases.inquiryPrint')}
          </Button>
        </div>
      </div>
      {item.status === 'APPROVED' ? null : (
        <div className="flex flex-wrap gap-3 text-sm text-ink-600">
          {item.center.phone ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5 text-teal-600" aria-hidden />
              {localizeDigits(item.center.phone, locale)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5 text-teal-600" aria-hidden />
            <span className="font-medium text-ink-700">{t('cases.inquiryHandlingOfficer')} :</span>
            {item.center.officerName ? (
              <span>{item.center.officerName}</span>
            ) : (
              <span className="text-ink-400">{t('cases.inquiryNoOfficer')}</span>
            )}
          </span>
        </div>
      )}
      {item.status === 'PENDING' ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor={`inquiry-note-${item.id}`}
                className="flex items-center gap-2 text-sm font-medium text-ink-900"
              >
                <FileText className="size-4 text-teal-600" aria-hidden />
                {t('cases.inquiryNote')}
              </label>
              <Button type="button" variant="ghost" onClick={() => setAttachmentOpen((open) => !open)}>
                <Paperclip className="size-4" aria-hidden />
                {t('cases.inquiryAddAttachment')}
              </Button>
            </div>
            <textarea
              id={`inquiry-note-${item.id}`}
              className={fieldClassName}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          {attachmentOpen ? (
            <FormField icon={Paperclip} label={t('cases.inquiryAttachment')} htmlFor={`inquiry-file-${item.id}`}>
              <FileDropField
                id={`inquiry-file-${item.id}`}
                accept="image/*,application/pdf"
                allowCamera
                onFile={setFile}
                onClear={() => setFile(null)}
              />
            </FormField>
          ) : null}
          <InquiryFiles files={item.files} />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              className={decisionButtonClassName}
              disabled={saving}
              onClick={() => void decide('APPROVED')}
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
      ) : item.status === 'APPROVED' ? (
        <ApprovedInquirySummary item={item} locale={locale} saving={saving} onReopen={askReopen} />
      ) : (
        <div className="space-y-2">
          {item.note ? <p className="text-sm whitespace-pre-wrap text-ink-800">{item.note}</p> : null}
          {item.decidedBy ? <p className="text-xs text-ink-500">{item.decidedBy.fullName}</p> : null}
          <InquiryFiles files={item.files} />
          <div className="flex justify-end">
            <Button type="button" variant="ghost" disabled={saving} onClick={askReopen}>
              <RotateCcw className="size-4" aria-hidden />
              {t('cases.inquiryReopen')}
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}

function ApprovedInquirySummary({
  item,
  locale,
  saving,
  onReopen,
}: {
  item: CaseInquiryRow
  locale: string
  saving: boolean
  onReopen: () => void
}) {
  const { t } = useTranslation()
  const elapsed =
    item.decidedAt != null ? inquiryElapsedLabel(item.createdAt, item.decidedAt, t, locale) : null

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {item.center.phone ? (
          <FormFactTile
            icon={Phone}
            label={t('users.phone')}
            value={localizeDigits(item.center.phone, locale)}
            tone="mint"
          />
        ) : null}
        <FormFactTile
          icon={UserRound}
          label={t('cases.inquiryOfficer')}
          value={item.center.officerName || t('cases.inquiryNoOfficer')}
          empty={!item.center.officerName}
          tone="mint"
        />
        {item.channel ? (
          <FormFactTile icon={Radio} label={t('cases.inquiryChannel')} value={t(`cases.inquiryChannels.${item.channel}`)} tone="teal" />
        ) : null}
        <FormFactTile
          icon={CalendarCheck}
          label={t('cases.inquiryDecidedAt')}
          tone="mint"
          value={
            <span className="flex flex-wrap items-center gap-2">
              <DateText value={item.decidedAt} withTime />
              {elapsed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200">
                  <Clock className="size-3" aria-hidden />
                  {elapsed}
                </span>
              ) : null}
            </span>
          }
        />
        {item.decidedBy ? (
          <FormFactTile icon={UserRound} label={t('cases.inquiryDecidedBy')} value={item.decidedBy.fullName} tone="teal" />
        ) : null}
        {item.note ? (
          <FormFactTile icon={FileText} label={t('cases.inquiryNote')} value={item.note} tone="ink" className="sm:col-span-2" />
        ) : null}
      </div>
      <InquiryFiles files={item.files} />
      <div className="flex justify-end">
        <Button type="button" variant="ghost" disabled={saving} onClick={onReopen}>
          <RotateCcw className="size-4" aria-hidden />
          {t('cases.inquiryReopen')}
        </Button>
      </div>
    </div>
  )
}

function InquiryLetterModal({
  inquiryId,
  locale,
  onClose,
}: {
  inquiryId: string
  locale: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['cases', 'inquiry-letter', inquiryId],
    queryFn: async () => (await api.get<CaseInquiryLetter>(`/cases/inquiries/${inquiryId}/letter`)).data,
  })
  const filled = useMemo(
    () => (query.data ? presentInquiryLetter(query.data, locale) : null),
    [query.data, locale],
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/30 p-4"
      data-nested-dialog
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={filled?.title || t('cases.inquiryPrint')}
        className="relative z-10 flex max-h-[min(40rem,85dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <div className="flex justify-end px-3 pt-3">
          <Button type="button" variant="ghost" icon onClick={onClose} aria-label={t('common.close')}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 sm:px-10">
          {query.isLoading ? <LoadingState variant="inline" /> : null}
          {query.isError ? (
            <p className="text-sm text-red-700">{getApiErrorMessage(query.error, t('cases.saveFailed'))}</p>
          ) : null}
          {filled ? (
            <article>
              <h2 className="mb-5 text-center text-base font-bold text-ink-900">{filled.title}</h2>
              <div className="whitespace-pre-wrap text-sm leading-8 text-ink-900">{filled.body}</div>
            </article>
          ) : null}
        </div>
        <div className="flex justify-center border-t border-teal-100 px-4 py-4">
          <Button
            type="button"
            className={decisionButtonClassName}
            disabled={!filled}
            onClick={() => {
              if (!filled) return
              printInquiryLetter(filled.title, filled.body)
            }}
          >
            <Printer className="size-4" aria-hidden />
            {t('cases.inquiryPrint')}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
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
