import { Paperclip, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Form'
import { FileDropField } from '../../components/ui/FileDropField'
import type { ViolationAttachment } from '../../types/app'
import { VIOLATION_FILE_ACCEPT } from './constants'

export function AttachmentField({
  id,
  existing = [],
  removedIds,
  onToggleRemove,
  files,
  onFilesChange,
}: {
  id: string
  existing?: ViolationAttachment[]
  removedIds?: string[]
  onToggleRemove?: (id: string) => void
  files: File[]
  onFilesChange: (files: File[]) => void
}) {
  const { t } = useTranslation()
  const [pickerKey, setPickerKey] = useState(0)
  const removed = new Set(removedIds ?? [])

  return (
    <div className="space-y-3">
      {existing.length ? (
        <ul className="space-y-2">
          {existing.map((item) => {
            const marked = removed.has(item.id)
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-3 py-2"
              >
                <span className={`flex min-w-0 items-center gap-2 text-sm ${marked ? 'text-ink-400 line-through' : 'text-ink-800'}`}>
                  <Paperclip className="size-4 shrink-0 text-teal-600" aria-hidden />
                  <span className="truncate">{item.originalName || t('violations.attachments')}</span>
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
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-cream-50 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-ink-800">
                <Paperclip className="size-4 shrink-0 text-teal-600" aria-hidden />
                <span className="truncate">{file.name}</span>
              </span>
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
          ))}
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
