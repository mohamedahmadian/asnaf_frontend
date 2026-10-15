import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Check, FileText, IdCard, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, FormField } from '../../components/ui/Form'
import { FileDropField } from '../../components/ui/FileDropField'
import { SearchSelect } from '../../components/ui/SearchSelect'
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
  readOnly = false,
  framed = false,
  layout = 'grid',
  emphasizeRequired = false,
  fileBase = '/cases/formation/documents',
  showOtherDocuments = false,
  otherReservedIds,
  onFile,
  onOtherFile,
  onDelete,
}: {
  items: DocumentTypeRow[]
  stored: { documentId: string; current: StoredVersion | null }[]
  uploadingId: string | null
  removingId?: string | null
  disabled: boolean
  readOnly?: boolean
  framed?: boolean
  layout?: 'grid' | 'tabs'
  emphasizeRequired?: boolean
  fileBase?: string
  showOtherDocuments?: boolean
  otherReservedIds?: string[]
  onFile: (documentId: string, file: File) => void
  onOtherFile?: (documentId: string, file: File) => void
  onDelete?: (documentId: string) => void
}) {
  const { t } = useTranslation()
  const otherTabId = 'other-documents'
  const reserved = new Set(otherReservedIds ?? items.map((item) => item.id))
  const otherDone = showOtherDocuments && stored.some((row) => row.current && !reserved.has(row.documentId))
  const [activeId, setActiveId] = useState(() => items[0]?.id ?? (showOtherDocuments ? otherTabId : ''))

  useEffect(() => {
    if (layout !== 'tabs') return
    if (items.some((item) => item.id === activeId)) return
    if (showOtherDocuments && activeId === otherTabId) return
    setActiveId(items[0]?.id ?? (showOtherDocuments ? otherTabId : ''))
  }, [activeId, items, layout, otherTabId, showOtherDocuments])

  const otherPanel: ReactNode = showOtherDocuments ? (
    <CaseOtherDocumentsPanel
      reservedIds={[...reserved]}
      stored={stored}
      uploadingId={uploadingId}
      removingId={removingId}
      disabled={disabled || readOnly}
      fileBase={fileBase}
      onFile={(documentId, file) => (onOtherFile ?? onFile)(documentId, file)}
      onDelete={onDelete}
    />
  ) : null

  function uploadFor(item: DocumentTypeRow) {
    return (
      <DocumentUpload
        key={item.id}
        item={item}
        current={stored.find((row) => row.documentId === item.id)?.current ?? null}
        uploading={uploadingId === item.id}
        removing={removingId === item.id}
        disabled={disabled || readOnly}
        framed={layout === 'tabs' ? false : framed}
        previewClassName={layout === 'tabs' ? documentPreviewClassName : undefined}
        markRequired={emphasizeRequired && item.isRequired}
        fileBase={fileBase}
        onFile={(file) => onFile(item.id, file)}
        onDelete={onDelete ? () => onDelete(item.id) : undefined}
      />
    )
  }

  if (layout === 'tabs') {
    const active = items.find((item) => item.id === activeId)
    return (
      <div className="space-y-4">
        {disabled && !readOnly ? <p className="text-sm text-ink-500">{t('cases.saveBeforeDocuments')}</p> : null}
        <div role="tablist" className="flex flex-wrap gap-2">
          {items.map((item) => {
            const uploaded = Boolean(stored.find((row) => row.documentId === item.id)?.current)
            const selected = item.id === activeId
            const requiredMark = emphasizeRequired && item.isRequired
            const requiredDone = requiredMark && uploaded
            const tabTone = requiredDone
              ? selected
                ? 'border-2 border-emerald-400 bg-emerald-100 text-emerald-800'
                : 'border border-emerald-300 bg-emerald-50 text-emerald-800'
              : requiredMark
                ? selected
                  ? 'border-2 border-red-300 bg-red-100 text-red-800'
                  : 'border border-red-200 bg-red-50 text-red-700'
                : selected
                  ? 'bg-teal-500 text-white'
                  : 'border border-teal-400 bg-white text-ink-700'
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-4 py-2 text-sm ${tabTone}`}
                onClick={() => setActiveId(item.id)}
              >
                <span>{item.title}</span>
                {requiredMark ? (
                  <span className={requiredDone ? 'text-emerald-600' : 'text-red-500'} aria-hidden>
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
          {showOtherDocuments ? (
            <button
              type="button"
              role="tab"
              aria-selected={activeId === otherTabId}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-4 py-2 text-sm ${
                activeId === otherTabId
                  ? 'bg-teal-500 text-white'
                  : 'border border-teal-400 bg-white text-ink-700'
              }`}
              onClick={() => setActiveId(otherTabId)}
            >
              <span>{t('cases.otherDocuments')}</span>
              {otherDone ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
            </button>
          ) : null}
        </div>
        {activeId === otherTabId && otherPanel ? (
          <div role="tabpanel" className="rounded-2xl border border-teal-100 bg-cream-50/60 p-4">
            {otherPanel}
          </div>
        ) : active ? (
          <div role="tabpanel" className="rounded-2xl border border-teal-100 bg-cream-50/60 p-4">
            {uploadFor(active)}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {disabled && !readOnly ? <p className="text-sm text-ink-500 lg:col-span-2">{t('cases.saveBeforeDocuments')}</p> : null}
      {items.map((item) => uploadFor(item))}
      {otherPanel ? <div className="lg:col-span-2">{otherPanel}</div> : null}
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
  fileBase,
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
  fileBase: string
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
      .get<Blob>(`${fileBase}/${current.id}/file`, { responseType: 'blob' })
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
  }, [current, fileBase])

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

function CaseOtherDocumentsPanel({
  reservedIds,
  stored,
  uploadingId,
  removingId,
  disabled,
  fileBase,
  onFile,
  onDelete,
}: {
  reservedIds: string[]
  stored: { documentId: string; current: StoredVersion | null }[]
  uploadingId: string | null
  removingId?: string | null
  disabled: boolean
  fileBase: string
  onFile: (documentId: string, file: File) => void
  onDelete?: (documentId: string) => void
}) {
  const { t } = useTranslation()
  const [pick, setPick] = useState('')
  const catalog = useQuery({
    queryKey: ['cases', 'document-catalog'],
    queryFn: async () => (await api.get<{ id: string; title: string }[]>('/cases/formation/document-catalog')).data,
  })
  const reservedKey = reservedIds.join('\0')
  const reserved = new Set(reservedIds)
  const options = (catalog.data ?? []).filter((item) => !reserved.has(item.id))
  const added = options.filter((item) => stored.some((row) => row.documentId === item.id && row.current))
  const selected = options.find((item) => item.id === pick) ?? null

  useEffect(() => {
    if (!pick || !catalog.data) return
    const blocked = new Set(reservedKey ? reservedKey.split('\0') : [])
    const stillThere = catalog.data.some((item) => item.id === pick && !blocked.has(item.id))
    if (!stillThere) setPick('')
  }, [catalog.data, pick, reservedKey])

  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-ink-600">{t('cases.otherDocumentsHint')}</p>
      {added.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {added.map((item) => {
            const chosen = item.id === pick
            return (
              <button
                key={item.id}
                type="button"
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm ${
                  chosen ? 'bg-teal-500 text-white' : 'border border-teal-300 bg-white text-ink-700'
                }`}
                onClick={() => setPick(item.id)}
              >
                <span>{item.title}</span>
                <Check className="size-3.5 shrink-0" aria-hidden />
              </button>
            )
          })}
        </div>
      ) : null}
      <FormField icon={FileText} label={t('cases.otherDocumentType')} htmlFor="case-other-document-type">
        <SearchSelect
          id="case-other-document-type"
          value={pick}
          onChange={setPick}
          placeholder={
            catalog.isLoading
              ? t('cases.otherDocumentTypePlaceholder')
              : options.length === 0
                ? t('cases.otherDocumentsEmptyCatalog')
                : t('cases.otherDocumentTypePlaceholder')
          }
          disabled={disabled || catalog.isLoading || options.length === 0}
          options={options.map((item) => ({ value: item.id, label: item.title }))}
        />
      </FormField>
      {selected ? (
        <DocumentUpload
          key={selected.id}
          item={{
            id: selected.id,
            code: null,
            title: selected.title,
            isRequired: false,
            gender: 'BOTH',
          }}
          current={stored.find((row) => row.documentId === selected.id)?.current ?? null}
          uploading={uploadingId === selected.id}
          removing={removingId === selected.id}
          disabled={disabled}
          framed={false}
          previewClassName={documentPreviewClassName}
          fileBase={fileBase}
          onFile={(file) => onFile(selected.id, file)}
          onDelete={onDelete ? () => onDelete(selected.id) : undefined}
        />
      ) : (
        <p className="text-sm text-ink-500">{t('cases.otherDocumentPickType')}</p>
      )}
    </div>
  )
}
