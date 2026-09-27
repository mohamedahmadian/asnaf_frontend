import { AlertTriangle, Check, StickyNote, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, FormField, fieldClassName } from './Form'

export function confirmToast({
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmVariant = 'primary',
  prompt,
}: {
  title: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: (value?: string) => void | Promise<void>
  /** `primary` (فیروزه‌ای) برای بله/تأیید؛ فقط حذف و انصراف/رد مخرب `danger` */
  confirmVariant?: 'primary' | 'danger'
  prompt?: {
    label: string
    placeholder?: string
    hint?: string
    required?: boolean
    minLength?: number
    requiredMessage?: string
  }
}) {
  const isDanger = confirmVariant === 'danger'
  toast.custom(
    (id) => (
      <ConfirmToastCard
        id={id}
        title={title}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        confirmVariant={confirmVariant}
        isDanger={isDanger}
        prompt={prompt}
        onConfirm={onConfirm}
      />
    ),
    { duration: Infinity, closeButton: false, unstyled: true },
  )
}

function ConfirmToastCard({
  id,
  title,
  confirmLabel,
  cancelLabel,
  confirmVariant,
  isDanger,
  prompt,
  onConfirm,
}: {
  id: string | number
  title: string
  confirmLabel: string
  cancelLabel: string
  confirmVariant: 'primary' | 'danger'
  isDanger: boolean
  prompt?: {
    label: string
    placeholder?: string
    hint?: string
    required?: boolean
    minLength?: number
    requiredMessage?: string
  }
  onConfirm: (value?: string) => void | Promise<void>
}) {
  const [value, setValue] = useState('')
  const inputId = `confirm-toast-${id}`

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.repeat || event.isComposing) return
      event.preventDefault()
      toast.dismiss(id)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [id])

  function submit() {
    const trimmed = value.trim()
    const minLength = prompt?.minLength ?? 1
    if (prompt?.required && trimmed.length < minLength) {
      toast.error(prompt.requiredMessage ?? prompt.label)
      return
    }
    toast.dismiss(id)
    void onConfirm(prompt ? trimmed : undefined)
  }

  return (
    <div
      data-confirm-toast=""
      className="w-[min(100vw-2rem,22rem)] rounded-[22px] border border-white bg-white p-4 shadow-[0_16px_40px_rgba(20,40,40,0.14)]"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
            isDanger ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-600'
          }`}
        >
          {isDanger ? (
            <AlertTriangle className="size-5" aria-hidden />
          ) : (
            <Check className="size-5" aria-hidden />
          )}
        </div>
        <p className="pt-1.5 text-sm font-medium text-ink-900">{title}</p>
      </div>
      {prompt ? (
        <div className="mt-3">
          <FormField icon={StickyNote} label={prompt.label} htmlFor={inputId}>
            <textarea
              id={inputId}
              className={fieldClassName}
              rows={2}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={prompt.placeholder}
            />
          </FormField>
          {prompt.hint ? <p className="mt-1.5 text-xs text-ink-500">{prompt.hint}</p> : null}
        </div>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => toast.dismiss(id)}>
          <X className="size-4" aria-hidden />
          {cancelLabel}
        </Button>
        <Button type="button" variant={confirmVariant} onClick={submit}>
          <Check className="size-4" aria-hidden />
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}
