import { useEffect, useState } from 'react'
import { IdCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FileDropField } from '../../components/ui/FileDropField'
import { FormField } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { DocumentTypeRow, StoredVersion } from './formation-types'

export function CaseDocumentList({
  items,
  stored,
  uploadingId,
  disabled,
  framed = false,
  onFile,
}: {
  items: DocumentTypeRow[]
  stored: { documentId: string; current: StoredVersion | null }[]
  uploadingId: string | null
  disabled: boolean
  framed?: boolean
  onFile: (documentId: string, file: File) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {disabled ? <p className="text-sm text-ink-500 lg:col-span-2">{t('cases.saveBeforeDocuments')}</p> : null}
      {items.map((item) => {
        const current = stored.find((row) => row.documentId === item.id)?.current ?? null
        return (
          <DocumentUpload
            key={item.id}
            item={item}
            current={current}
            uploading={uploadingId === item.id}
            disabled={disabled}
            framed={framed}
            onFile={(file) => onFile(item.id, file)}
          />
        )
      })}
    </div>
  )
}

function DocumentUpload({
  item,
  current,
  uploading,
  disabled,
  framed,
  onFile,
}: {
  item: DocumentTypeRow
  current: StoredVersion | null
  uploading: boolean
  disabled: boolean
  framed: boolean
  onFile: (file: File) => void
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
      <FormField icon={IdCard} label={item.title} htmlFor={`doc-${item.id}`}>
        <p className="text-xs text-ink-400">
          {item.isRequired ? t('cases.documentRequired') : t('cases.documentOptional')}
          {current?.originalName ? ` · ${current.originalName}` : ''}
        </p>
        <FileDropField
          id={`doc-${item.id}`}
          accept="image/*,application/pdf"
          allowCamera
          previewUrl={previewUrl}
          uploading={uploading}
          onFile={(file) => {
            if (!disabled) onFile(file)
          }}
        />
      </FormField>
    </div>
  )
}
