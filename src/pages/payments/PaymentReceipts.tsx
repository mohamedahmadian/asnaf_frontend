import { ChevronLeft, ChevronRight, ExternalLink, Eye, ReceiptText, Trash2, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import { FileDropField } from '../../components/ui/FileDropField'
import { Button } from '../../components/ui/Form'
import { FormEmptyHint, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { PaymentReceipt } from '../../types/app'

const MAX_RECEIPTS = 10

function ReceiptViewer({
  receipts,
  index,
  onIndexChange,
  onClose,
}: {
  receipts: PaymentReceipt[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const dialogRef = useRef<HTMLDivElement>(null)
  const receipt = receipts[index]
  const total = receipts.length

  const step = useCallback(
    (delta: number) => onIndexChange((index + delta + total) % total),
    [index, onIndexChange, total],
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      const modals = document.querySelectorAll('[aria-modal="true"]')
      if (dialogRef.current && modals[modals.length - 1] !== dialogRef.current) return
      if (event.key === 'Escape' && !event.repeat) {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      if (total < 2) return
      const rtl = document.documentElement.dir === 'rtl'
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        step(rtl ? 1 : -1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(rtl ? -1 : 1)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose, step, total])

  if (!receipt) return null
  const url = getImageUrl(receipt.imageId)

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" data-nested-dialog>
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink-900/70"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('payments.receiptView')}
        className="relative z-10 flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-teal-100 bg-[linear-gradient(to_inline-end,var(--color-teal-50),var(--color-mint-50))] px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white">
            <ReceiptText className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">
              {receipt.originalName || t('payments.receipts')}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
              <span>{t('payments.receiptUploadedBy', { name: receipt.uploadedBy.fullName })}</span>
              <DateText value={receipt.createdAt} withTime />
            </p>
          </div>
          {total > 1 ? (
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-700 shadow-sm">
              {t('payments.receiptPosition', {
                current: formatNumber(index + 1, locale),
                total: formatNumber(total, locale),
              })}
            </span>
          ) : null}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title={t('payments.receiptOpenOriginal')}
            aria-label={t('payments.receiptOpenOriginal')}
          >
            <Button type="button" variant="ghost" icon>
              <ExternalLink className="size-4" aria-hidden />
            </Button>
          </a>
          <Button type="button" variant="ghost" icon onClick={onClose} aria-label={t('common.close')} title={t('common.close')}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-ink-900/5 p-3">
          <img
            key={receipt.id}
            src={url}
            alt={receipt.originalName || t('payments.receipts')}
            className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
          />
          {total > 1 ? (
            <>
              <Button
                type="button"
                variant="ghost"
                icon
                className="absolute start-3 top-1/2 -translate-y-1/2 bg-white/90"
                aria-label={t('payments.receiptPrevious')}
                title={t('payments.receiptPrevious')}
                onClick={() => step(-1)}
              >
                <ChevronRight className="size-5 ltr:rotate-180" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                icon
                className="absolute end-3 top-1/2 -translate-y-1/2 bg-white/90"
                aria-label={t('payments.receiptNext')}
                title={t('payments.receiptNext')}
                onClick={() => step(1)}
              >
                <ChevronLeft className="size-5 ltr:rotate-180" aria-hidden />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function PaymentReceipts({
  paymentId,
  receipts,
  readOnly = false,
}: {
  paymentId: string
  receipts: PaymentReceipt[]
  readOnly?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const [uploading, setUploading] = useState(false)
  const [viewIndex, setViewIndex] = useState<number | null>(null)
  const [uploadKey, setUploadKey] = useState(0)
  const full = receipts.length >= MAX_RECEIPTS

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['payment-history'] })
  }

  async function upload(file: File) {
    if (full) {
      toast.error(t('payments.receiptLimit'))
      return
    }
    setUploading(true)
    try {
      const prepared = await optimizeImageFile(file)
      const body = new FormData()
      body.append('file', prepared)
      await api.post(`/payment-history/${paymentId}/receipts`, body)
      toast.success(t('payments.receiptUploaded'))
      refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(false)
      setUploadKey((key) => key + 1)
    }
  }

  function remove(receipt: PaymentReceipt) {
    confirmDelete({
      message: t('payments.receiptDeleteConfirm'),
      successMessage: t('payments.receiptDeleted'),
      path: `/payment-history/${paymentId}/receipts/${receipt.id}`,
      queryKey: ['payment-history'],
      onDeleted: () => setViewIndex(null),
    })
  }

  return (
    <div className="space-y-4">
      <FormSectionTitle
        icon={ReceiptText}
        action={
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700" dir="ltr">
            {formatNumber(receipts.length, locale)} / {formatNumber(MAX_RECEIPTS, locale)}
          </span>
        }
      >
        {t('payments.receipts')}
      </FormSectionTitle>

      {receipts.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {receipts.map((receipt, index) => (
            <figure
              key={receipt.id}
              className="group overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-[0_6px_16px_rgba(46,189,182,0.08)] transition hover:border-teal-300 hover:shadow-[0_8px_20px_rgba(46,189,182,0.16)]"
            >
              <button
                type="button"
                className="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden bg-cream-50"
                onClick={() => setViewIndex(index)}
                aria-label={t('payments.receiptView')}
                title={t('payments.receiptView')}
              >
                <img
                  src={getImageUrl(receipt.imageId)}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-ink-900/0 text-white opacity-0 transition group-hover:bg-ink-900/30 group-hover:opacity-100">
                  <Eye className="size-6" aria-hidden />
                </span>
              </button>
              <figcaption className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-900">
                    <UserRound className="size-3.5 shrink-0 text-teal-600" aria-hidden />
                    <span className="truncate">{receipt.uploadedBy.fullName}</span>
                  </p>
                  <p className="text-xs text-ink-500">
                    <DateText value={receipt.createdAt} withTime />
                  </p>
                </div>
                {readOnly ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    icon
                    className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label={t('payments.receiptDelete')}
                    title={t('payments.receiptDelete')}
                    onClick={() => remove(receipt)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <FormEmptyHint>{t('payments.receiptsEmpty')}</FormEmptyHint>
      )}

      {readOnly ? null : full ? (
        <p className="text-xs text-ink-500">{t('payments.receiptLimit')}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-ink-500">{t('payments.receiptsHint')}</p>
          <FileDropField
            key={uploadKey}
            accept="image/*"
            capture="environment"
            hideLocalPreview
            uploading={uploading}
            onFile={(file) => void upload(file)}
          />
        </div>
      )}

      {viewIndex != null && receipts[viewIndex] ? (
        <ReceiptViewer
          receipts={receipts}
          index={viewIndex}
          onIndexChange={setViewIndex}
          onClose={() => setViewIndex(null)}
        />
      ) : null}
    </div>
  )
}
