import { Ban, CalendarDays, CirclePause, MessageSquareText, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { FormEmptyHint } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'

export type CaseSuspensionRow = {
  id: string
  reason: string
  startsAt: string
  endsAt: string
  active: boolean
}

function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function useDialogEscape(onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      if (document.querySelector('.rmdp-wrapper, [role="listbox"]')) return
      event.preventDefault()
      event.stopPropagation()
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [])
}

export function SuspensionCountBadge({
  count,
  label,
  locale,
  onClick,
}: {
  count: number
  label: string
  locale: string
  onClick: () => void
}) {
  const text = formatNumber(count, locale)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white/80 px-2.5 py-1.5 ring-1 ring-amber-200 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      aria-label={`${label}: ${text}`}
    >
      <span className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-full bg-amber-50 ring-[5px] ring-amber-200">
        <span className="text-sm font-semibold leading-none text-amber-900">{text}</span>
      </span>
      <span className="flex max-w-16 flex-col items-start gap-0.5">
        <CirclePause className="size-3.5 text-amber-700" aria-hidden />
        <span className="text-[11px] font-medium leading-4 text-ink-500">{label}</span>
      </span>
    </button>
  )
}

export function CaseSuspendDialog({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [startsAt, setStartsAt] = useState(todayIso)
  const [endsAt, setEndsAt] = useState('')
  const [saving, setSaving] = useState(false)
  useDialogEscape(onClose)

  async function submit() {
    if (saving || !reason.trim() || !startsAt || !endsAt) return
    setSaving(true)
    try {
      await api.post(`/cases/${caseId}/suspensions`, { reason: reason.trim(), startsAt, endsAt })
      const today = todayIso()
      toast.success(startsAt <= today && endsAt >= today ? t('cases.suspendSaved') : t('cases.suspendScheduled'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'home', caseId] })
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/30 p-4" data-nested-dialog>
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-suspend-title"
        className="relative z-10 flex max-h-[min(52rem,92dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-amber-50 via-white to-orange-50 px-5 py-4">
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-[0_8px_16px_rgba(217,119,6,0.28)]">
                <CirclePause className="size-5" aria-hidden />
              </span>
              <h2 id="case-suspend-title" className="truncate text-sm font-semibold text-ink-900">
                {t('cases.suspendTitle')}
              </h2>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>
        <AppForm onSubmit={() => void submit()} autoFocusFirst className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          <FormField icon={MessageSquareText} label={t('cases.suspendReason')} htmlFor="suspendReason">
            <textarea
              id="suspendReason"
              rows={12}
              required
              maxLength={8000}
              value={reason}
              placeholder={t('cases.suspendReasonPlaceholder')}
              onChange={(event) => setReason(event.target.value)}
              className={`${fieldClassName} min-h-64 resize-y`}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField icon={CalendarDays} label={t('cases.suspendStartsAt')} htmlFor="suspendStartsAt">
              <PersianDateField
                id="suspendStartsAt"
                value={startsAt}
                onChange={(value) => {
                  const next = value ?? ''
                  setStartsAt(next)
                  if (next && endsAt && next > endsAt) setEndsAt('')
                }}
                maxDate={endsAt || undefined}
              />
              <input className="sr-only" tabIndex={-1} value={startsAt} required onChange={() => undefined} />
            </FormField>
            <FormField icon={CalendarDays} label={t('cases.suspendEndsAt')} htmlFor="suspendEndsAt">
              <PersianDateField
                id="suspendEndsAt"
                value={endsAt}
                onChange={(value) => setEndsAt(value ?? '')}
                minDate={startsAt || undefined}
              />
              <input className="sr-only" tabIndex={-1} value={endsAt} required onChange={() => undefined} />
            </FormField>
          </div>
          <FormActions
            headerIcons={false}
            submitting={saving}
            submitLabel={t('cases.suspendConfirm')}
            cancelLabel={t('common.cancel')}
            onCancel={onClose}
          />
        </AppForm>
      </section>
    </div>,
    document.body,
  )
}

export function CaseRevokeDialog({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  useDialogEscape(onClose)

  async function submit() {
    if (saving || !reason.trim()) return
    setSaving(true)
    try {
      await api.post(`/cases/${caseId}/revocation`, { reason: reason.trim() })
      toast.success(t('cases.revokeSaved'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'home', caseId] })
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-ink-900/30 p-4 pt-[10vh]" data-nested-dialog>
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-revoke-title"
        className="relative z-10 flex max-h-[min(32rem,84dvh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-red-50 via-white to-rose-50 px-5 py-4">
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-[0_8px_16px_rgba(220,38,38,0.28)]">
                <Ban className="size-5" aria-hidden />
              </span>
              <h2 id="case-revoke-title" className="truncate text-sm font-semibold text-ink-900">
                {t('cases.revokeTitle')}
              </h2>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>
        <AppForm onSubmit={() => void submit()} autoFocusFirst className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <FormField icon={MessageSquareText} label={t('cases.revokeReason')} htmlFor="revokeReason">
            <textarea
              id="revokeReason"
              rows={4}
              required
              maxLength={2000}
              value={reason}
              placeholder={t('cases.revokeReasonPlaceholder')}
              onChange={(event) => setReason(event.target.value)}
              className={fieldClassName}
            />
          </FormField>
          <FormActions
            headerIcons={false}
            submitting={saving}
            submitLabel={t('cases.revokeConfirm')}
            cancelLabel={t('common.cancel')}
            onCancel={onClose}
          />
        </AppForm>
      </section>
    </div>,
    document.body,
  )
}

export function CaseSuspensionsDialog({
  name,
  items,
  onClose,
}: {
  name: string
  items: CaseSuspensionRow[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find((item) => item.id === selectedId) ?? null
  useDialogEscape(() => {
    if (selectedId) setSelectedId(null)
    else onClose()
  })

  return createPortal(
    <>
      <div className="fixed inset-0 z-[80] flex items-start justify-center bg-ink-900/30 p-4 pt-[10vh]" data-nested-dialog>
        <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-suspensions-title"
          className="relative z-10 flex max-h-[min(36rem,80dvh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
        >
          <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-amber-50 via-white to-orange-50 px-5 py-4">
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-[0_8px_16px_rgba(217,119,6,0.28)]">
                  <CirclePause className="size-5" aria-hidden />
                </span>
                <h2 id="case-suspensions-title" className="truncate text-sm font-semibold text-ink-900">
                  {t('cases.personSuspensions', { name: name || t('cases.details') })}
                </h2>
              </div>
              <button
                type="button"
                className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
                onClick={onClose}
                aria-label={t('common.close')}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {items.length === 0 ? <FormEmptyHint>{t('cases.suspensionsEmpty')}</FormEmptyHint> : null}
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="flex w-full cursor-pointer flex-col gap-1.5 rounded-2xl border border-amber-100 bg-white px-3 py-3 text-start transition hover:border-amber-300 hover:bg-amber-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium text-ink-900">{item.reason}</span>
                      <SuspensionState item={item} />
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                      <DateText value={item.startsAt} />
                      <span aria-hidden>—</span>
                      <DateText value={item.endsAt} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      {selected ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-ink-900/40 p-4 pt-[8vh]" data-nested-dialog>
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={t('common.close')}
            onClick={() => setSelectedId(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-suspension-detail-title"
            className="relative z-10 flex max-h-[min(40rem,84dvh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
          >
            <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-amber-50 via-white to-orange-50 px-5 py-4">
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-[0_8px_16px_rgba(217,119,6,0.28)]">
                    <CirclePause className="size-5" aria-hidden />
                  </span>
                  <h2 id="case-suspension-detail-title" className="truncate text-sm font-semibold text-ink-900">
                    {t('cases.suspendTitle')}
                  </h2>
                </div>
                <button
                  type="button"
                  className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
                  onClick={() => setSelectedId(null)}
                  aria-label={t('common.close')}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex justify-end">
                <SuspensionState item={selected} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <p className="rounded-2xl bg-cream-50 px-3 py-2 text-sm text-ink-800">
                  <span className="mb-1 block text-xs text-ink-500">{t('cases.suspendStartsAt')}</span>
                  <DateText value={selected.startsAt} />
                </p>
                <p className="rounded-2xl bg-cream-50 px-3 py-2 text-sm text-ink-800">
                  <span className="mb-1 block text-xs text-ink-500">{t('cases.suspendEndsAt')}</span>
                  <DateText value={selected.endsAt} />
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-ink-800">{selected.reason}</p>
            </div>
          </section>
        </div>
      ) : null}
    </>,
    document.body,
  )
}

function SuspensionState({ item }: { item: CaseSuspensionRow }) {
  const { t } = useTranslation()
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
        item.active ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-cream-50 text-ink-600 ring-line'
      }`}
    >
      {item.active ? t('cases.suspensionActive') : t('cases.suspensionEnded')}
    </span>
  )
}
