import { FileText, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Form'
import { FileDropField } from '../../components/ui/FileDropField'
import { api } from '../../lib/api'
import type { ViolationAttachment } from '../../types/app'
import { VIOLATION_FILE_ACCEPT } from './constants'

function isImageFile(file: File) {
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name)
}

function useFilePreviews(files: File[]) {
  const [urls, setUrls] = useState<(string | undefined)[]>([])

  useEffect(() => {
    const next = files.map((file) => (isImageFile(file) ? URL.createObjectURL(file) : undefined))
    setUrls(next)
    return () => {
      for (const url of next) if (url) URL.revokeObjectURL(url)
    }
  }, [files])

  return urls
}

function StoredImagePreview({ href }: { href: string }) {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    void api
      .get<Blob>(href, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(data)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setUrl(undefined)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [href])

  if (!url) return <FileText className="size-8 text-teal-600" aria-hidden />
  return <img src={url} alt="" className="h-28 w-28 rounded-2xl object-cover" />
}

export function AttachmentField({
  id,
  existing = [],
  previewHref,
  removedIds,
  onToggleRemove,
  files,
  onFilesChange,
}: {
  id: string
  existing?: ViolationAttachment[]
  previewHref?: (attachmentId: string) => string
  removedIds?: string[]
  onToggleRemove?: (id: string) => void
  files: File[]
  onFilesChange: (files: File[]) => void
}) {
  const { t } = useTranslation()
  const [pickerKey, setPickerKey] = useState(0)
  const previews = useFilePreviews(files)
  const removed = new Set(removedIds ?? [])

  return (
    <div className="space-y-3">
      {existing.length ? (
        <ul className="flex flex-wrap gap-3">
          {existing.map((item) => {
            const marked = removed.has(item.id)
            const href = item.kind === 'IMAGE' && previewHref ? previewHref(item.id) : undefined
            return (
              <li
                key={item.id}
                className={`flex w-28 flex-col items-center gap-2 ${marked ? 'opacity-40' : ''}`}
              >
                <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-line bg-white">
                  {href ? (
                    <StoredImagePreview href={href} />
                  ) : (
                    <FileText className="size-8 text-teal-600" aria-hidden />
                  )}
                </span>
                <span className={`w-full truncate text-center text-xs ${marked ? 'text-ink-400 line-through' : 'text-ink-700'}`}>
                  {item.originalName || t('violations.attachments')}
                </span>
                {onToggleRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    icon
                    aria-label={t('violations.removeAttachment')}
                    title={t('violations.removeAttachment')}
                    onClick={() => onToggleRemove(item.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
      {files.length ? (
        <ul className="flex flex-wrap gap-3">
          {files.map((file, index) => {
            const preview = previews[index]
            return (
              <li key={`${file.name}-${file.size}-${index}`} className="flex w-28 flex-col items-center gap-2">
                <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-line bg-cream-50">
                  {preview ? (
                    <img src={preview} alt="" className="h-28 w-28 object-cover" />
                  ) : (
                    <FileText className="size-8 text-teal-600" aria-hidden />
                  )}
                </span>
                <span className="w-full truncate text-center text-xs text-ink-700">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  aria-label={t('violations.removeAttachment')}
                  title={t('violations.removeAttachment')}
                  onClick={() => onFilesChange(files.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>
      ) : null}
      <FileDropField
        key={pickerKey}
        id={id}
        accept={VIOLATION_FILE_ACCEPT}
        hideLocalPreview
        onFile={(file) => {
          onFilesChange([...files, file])
          setPickerKey((value) => value + 1)
        }}
      />
    </div>
  )
}
