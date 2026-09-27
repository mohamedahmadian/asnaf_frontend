import { Check, Minus } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function CheckboxField({
  id,
  checked,
  onChange,
  label,
  disabled,
  readOnly,
  compact,
  indeterminate,
}: {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  disabled?: boolean
  readOnly?: boolean
  compact?: boolean
  indeterminate?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inactive = Boolean(disabled || readOnly)
  const filled = checked || Boolean(indeterminate)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate) && !checked
    }
  }, [indeterminate, checked])

  return (
    <label
      className={`relative flex items-center transition ${
        compact
          ? 'size-9 justify-center'
          : `gap-3 rounded-2xl border px-3 py-2.5 text-sm ${
              filled
                ? 'border-teal-200 bg-teal-50 text-ink-900'
                : 'border-teal-200 bg-white text-ink-800 shadow-[0_2px_8px_rgba(46,189,182,0.14)] hover:border-teal-300 hover:bg-white'
            }`
      } ${inactive ? 'cursor-not-allowed' : 'cursor-pointer'} ${disabled ? 'opacity-60' : ''}`}
    >
      <input
        ref={inputRef}
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={inactive}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-lg border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-teal-400 ${
          checked
            ? 'border-teal-500 bg-teal-500 text-white shadow-sm'
            : indeterminate
              ? 'border-teal-400 bg-teal-100 text-teal-700'
              : 'border-teal-400 bg-white text-transparent shadow-[0_0_0_3px_rgba(94,212,206,0.28),0_2px_8px_rgba(46,189,182,0.22)]'
        }`}
        aria-hidden
      >
        {indeterminate && !checked ? (
          <Minus className="size-3.5 stroke-[3]" />
        ) : (
          <Check className="size-3.5 stroke-[3]" />
        )}
      </span>
      {compact ? <span className="sr-only">{label}</span> : <span className="min-w-0 flex-1">{label}</span>}
    </label>
  )
}
