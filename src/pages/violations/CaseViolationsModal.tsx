import { CalendarDays, FileText, History, ShieldAlert, Tag, X, type LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../components/ui/DateText'
import { Button } from '../../components/ui/Form'
import { FormEmptyHint, FormSectionTitle } from '../../components/ui/FormLayout'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import type { CaseViolationSummary } from '../../types/app'

export function CaseViolationsModal({
  caseFileId,
  licenseNumber,
  excludeViolationId,
  onClose,
}: {
  caseFileId: string
  licenseNumber: string | null
  excludeViolationId?: string
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useQuery({
    queryKey: ['case-violations', caseFileId],
    queryFn: async () =>
      (await api.get<CaseViolationSummary[]>(`/violations/by-case/${caseFileId}`)).data,
  })

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const items = (query.data ?? []).filter((item) => item.id !== excludeViolationId)
  const license = licenseNumber?.trim()
    ? localizeDigits(licenseNumber.trim(), locale)
    : null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" data-enter-ignore>
      <button
        type="button"
        className="absolute inset-0 bg-ink-900/30"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-violations-title"
        className="relative z-10 flex max-h-[min(40rem,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-[0_16px_40px_rgba(20,40,40,0.16)]"
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <FormSectionTitle icon={History} className="mb-0">
              <span id="case-violations-title">{t('violations.priorTitle')}</span>
            </FormSectionTitle>
            {license ? (
              <p className="mt-3 text-sm text-ink-600">
                {t('violations.licenseNumber')}: {license}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            icon
            className="size-9 shrink-0"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
          {query.isLoading ? (
            <p className="text-sm text-ink-500">{t('common.loading')}</p>
          ) : query.isError ? (
            <p className="text-sm text-red-700">{t('common.error')}</p>
          ) : items.length ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-teal-100 bg-cream-50 px-3 py-3"
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SummaryField icon={Tag} label={t('violations.violationType')} value={item.violationType.title} />
                    <SummaryField
                      icon={CalendarDays}
                      label={t('violations.occurredAt')}
                      value={<DateText value={item.occurredAt} />}
                    />
                    <SummaryField
                      icon={ShieldAlert}
                      label={t('violations.status')}
                      value={t(`violationStatuses.${item.status}`)}
                    />
                  </div>
                  <div className="mt-3 border-t border-teal-100 pt-3">
                    <SummaryField
                      icon={FileText}
                      label={t('violations.description')}
                      value={item.description?.trim() || '—'}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <FormEmptyHint>{t('violations.priorEmpty')}</FormEmptyHint>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function SummaryField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium text-ink-500">{label}</span>
        <span className="mt-0.5 block break-words text-sm font-semibold text-ink-900">{value}</span>
      </span>
    </div>
  )
}
