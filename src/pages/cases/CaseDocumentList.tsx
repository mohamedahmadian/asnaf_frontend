import { useEffect, useState } from 'react'
import { Check, IdCard, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, FormField } from '../../components/ui/Form'
import { FileDropField } from '../../components/ui/FileDropField'
import { confirmToast } from '../../components/ui/confirmToast'
import { api } from '../../lib/api'
import type { DocumentTypeRow, StoredVersion } from './formation-types'

const documentPreviewClassName = 'mx-auto mb-4 max-h-[28rem] w-full max-w-3xl rounded-2xl object-contain'

export function CaseDocumentList({
  items,
  stored,
  uploadingId,
  removingId,
  disabled,
  framed = false,
  layout = 'grid',
  emphasizeRequired = false,
  onFile,
  onDelete,
}: {
  items: DocumentTypeRow[]
  stored: { documentId: string; current: StoredVersion | null }[]
  uploadingId: string | null
  removingId?: string | null
  disabled: boolean
  framed?: boolean
  layout?: 'grid' | 'tabs'
  emphasizeRequired?: boolean
  onFile: (documentId: string, file: File) => void
  onDelete?: (documentId: string) => void
}) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState(() => items[0]?.id ?? '')

  useEffect(() => {
    if (layout !== 'tabs') return
    if (items.some((item) => item.id === activeId)) return
    setActiveId(items[0]?.id ?? '')
  }, [activeId, items, layout])

  function uploadFor(item: DocumentTypeRow) {
    return (
      <DocumentUpload
        key={item.id}
        item={item}
        current={stored.find((row) => row.documentId === item.id)?.current ?? null}
        uploading={uploadingId === item.id}
        removing={removingId === item.id}
        disabled={disabled}
        framed={layout === 'tabs' ? false : framed}
        previewClassName={layout === 'tabs' ? documentPreviewClassName : undefined}
        markRequired={emphasizeRequired && item.isRequired}
        onFile={(file) => onFile(item.id, file)}
        onDelete={onDelete ? () => onDelete(item.id) : undefined}
      />
    )
  }

  if (layout === 'tabs') {
    const active = items.find((item) => item.id === activeId) ?? items[0]
    return (
      <div className="space-y-4">
        {disabled ? <p className="text-sm text-ink-500">{t('cases.saveBeforeDocuments')}</p> : null}
        <div role="tablist" className="flex flex-wrap gap-2">
          {items.map((item) => {
            const uploaded = Boolean(stored.find((row) => row.documentId === item.id)?.current)
            const selected = item.id === active?.id
            const requiredMark = emphasizeRequired && item.isRequired
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-4 py-2 text-sm ${
                  requiredMark
                    ? selected
                      ? 'border-2 border-red-300 bg-red-100 text-red-800'
                      : 'border border-red-200 bg-red-50 text-red-700'
                    : selected
                      ? 'bg-teal-500 text-white'
                      : 'border border-teal-400 bg-white text-ink-700'
                }`}
                onClick={() => setActiveId(item.id)}
              >
                <span>{item.title}</span>
                {requiredMark ? (
                  <span className="text-red-500" aria-hidden>
                    *
                  </span>
                ) : null}
                {requiredMark ? <span className="sr-only">{t('cases.documentRequired')}</span> : null}
                {uploaded ? (
                  <Check className="size-3.5 shrink-0" aria-hidden />
                ) : item.isRequired && !requiredMark ? (
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${selected ? 'bg-white' : 'bg-orange-400'}`}
                    aria-hidden
                  />
                ) : null}
              </button>
            )
          })}
        </div>
        {active ? (
          <div role="tabpanel" className="rounded-2xl border border-teal-100 bg-cream-50/60 p-4">
            {uploadFor(active)}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {disabled ? <p className="text-sm text-ink-500 lg:col-span-2">{t('cases.saveBeforeDocuments')}</p> : null}
      {items.map((item) => uploadFor(item))}
    </div>
  )
}

function DocumentUpload({
  item,
  current,
  uploading,
  removing = false,
  disabled,
  framed,
  previewClassName,
  markRequired = false,
  onFile,
  onDelete,
}: {
  item: DocumentTypeRow
  current: StoredVersion | null
  uploading: boolean
  removing?: boolean
  disabled: boolean
  framed: boolean
  previewClassName?: string
  markRequired?: boolean
  onFile: (file: File) => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string>()

  useEffect(() => {
    if (!current || !current.mimeType.startsWith('image/')) {
      setPreviewUrl(undefined)
      return
    }
    let cancelled = false
    let url = ''
    void api
      .get<Blob>(`/cases/formation/documents/${current.id}/file`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return
        url = URL.createObjectURL(data)
        setPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(undefined)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [current])

  const frame = framed
    ? item.isRequired
      ? 'rounded-2xl border border-red-200 bg-red-50/50 p-3'
      : 'rounded-2xl border border-amber-200 bg-amber-50/60 p-3'
    : ''

  return (
    <div className={frame}>
      <FormField icon={IdCard} label={markRequired ? `${item.title} *` : item.title} htmlFor={`doc-${item.id}`}>
        <p className="text-xs text-ink-400">
          {item.isRequired ? t('cases.documentRequired') : t('cases.documentOptional')}
          {current?.originalName ? ` · ${current.originalName}` : ''}
        </p>
        <FileDropField
          id={`doc-${item.id}`}
          accept="image/*,application/pdf"
          allowCamera
          previewUrl={previewUrl}
          previewClassName={previewClassName}
          uploading={uploading || removing}
          onFile={(file) => {
            if (!disabled && !removing) onFile(file)
          }}
        />
        {current && onDelete ? (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || uploading || removing}
              onClick={() =>
                confirmToast({
                  title: t('cases.documentRemoveConfirm'),
                  confirmLabel: t('common.yesDelete'),
                  cancelLabel: t('common.cancel'),
                  confirmVariant: 'danger',
                  onConfirm: () => onDelete(),
                })
              }
            >
              <Trash2 className="size-4" aria-hidden />
              {t('cases.documentRemove')}
            </Button>
          </div>
        ) : null}
      </FormField>
    </div>
  )
}
