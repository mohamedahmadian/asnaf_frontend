import { CalendarDays, ClipboardList, FileText, Paperclip, Plus, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import { Button } from '../../components/ui/Form'
import { FormEmptyHint, FormSectionTitle } from '../../components/ui/FormLayout'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { ViolationProceeding } from '../../types/app'
import { appendFiles } from './files'
import { ProceedingForm } from './proceedings/ProceedingForm'

export function ProceedingsModal({
  violationId,
  personName,
  nationalId,
  onClose,
}: {
  violationId: string
  personName: string | null
  nationalId: string
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [formKey, setFormKey] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const query = useQuery({
    queryKey: ['violation-proceedings', violationId, 'modal'],
    queryFn: async () =>
      (await api.get<ViolationProceeding[]>(`/violations/${violationId}/proceedings`)).data,
  })
  const items = Array.isArray(query.data) ? query.data : []

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

  const who = personName?.trim() || localizeDigits(nationalId, locale)

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4" data-enter-ignore>
      <button
        type="button"
        className="absolute inset-0 bg-ink-900/30"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="violation-proceedings-title"
        className="relative z-10 flex max-h-[min(52rem,calc(100dvh-1.5rem))] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-[0_16px_40px_rgba(20,40,40,0.16)]"
      >
        <div className="flex shrink-0 flex-wrap items-start gap-3 border-b border-teal-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <FormSectionTitle icon={ClipboardList} className="mb-0">
              <span id="violation-proceedings-title">{t('violationProceedings.title')}</span>
            </FormSectionTitle>
            <p className="mt-2 text-sm text-ink-600">{who}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" variant="soft" onClick={() => setShowCreate((open) => !open)}>
              <Plus className="size-4" aria-hidden />
              {showCreate ? t('violationProceedings.cancelCreate') : t('violationProceedings.create')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              icon
              className="size-9"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto border-b border-teal-100 p-4 sm:p-5 lg:border-b-0 lg:border-e">
            {query.isLoading ? (
              <p className="text-sm text-ink-500">{t('common.loading')}</p>
            ) : query.isError ? (
              <p className="text-sm text-red-700">{t('common.error')}</p>
            ) : items.length ? (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-teal-100 bg-cream-50 px-3 py-3 sm:px-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <SummaryField
                        icon={CalendarDays}
                        label={t('violationProceedings.occurredAt')}
                        value={<DateText value={item.occurredAt} />}
                      />
                      <SummaryField
                        icon={ClipboardList}
                        label={t('violationProceedings.titleField')}
                        value={item.title}
                        className="sm:col-span-2"
                      />
                      <SummaryField
                        icon={Paperclip}
                        label={t('violationProceedings.attachmentCount')}
                        value={formatNumber(item._count?.attachments ?? 0, locale)}
                      />
                    </div>
                    <div className="mt-3 border-t border-teal-100 pt-3">
                      <SummaryField
                        icon={FileText}
                        label={t('violationProceedings.description')}
                        value={item.description?.trim() || '—'}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <FormEmptyHint>{t('violationProceedings.empty')}</FormEmptyHint>
            )}
          </div>
          <div
            className={`min-h-0 overflow-y-auto p-4 sm:p-5 ${showCreate ? '' : 'hidden lg:block'}`}
          >
            <ProceedingForm
              key={formKey}
              embedded
              onCancel={showCreate ? () => setShowCreate(false) : undefined}
              onSubmit={async (payload) => {
                const body = new FormData()
                body.append('occurredAt', payload.occurredAt)
                body.append('title', payload.title)
                body.append('description', payload.description ?? '')
                appendFiles(body, payload.files)
                await api.post(`/violations/${violationId}/proceedings`, body)
                toast.success(t('violationProceedings.created'))
                await queryClient.invalidateQueries({ queryKey: ['violation-proceedings', violationId] })
                setFormKey((key) => key + 1)
                setShowCreate(false)
              }}
            />
          </div>
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
  className = '',
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-w-0 items-start gap-2 ${className}`}>
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
