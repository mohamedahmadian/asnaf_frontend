import type { LucideIcon } from 'lucide-react'
import type { KeyboardEvent } from 'react'

export type FormTabItem = {
  id: string
  label: string
  icon?: LucideIcon
}

export function FormTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: FormTabItem[]
  value: string
  onChange: (id: string) => void
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const index = tabs.findIndex((tab) => tab.id === value)
    if (index < 0) return
    const forward = event.key === 'ArrowLeft'
      ? document.documentElement.dir === 'rtl'
      : document.documentElement.dir !== 'rtl'
    const next = tabs[(index + (forward ? 1 : -1) + tabs.length) % tabs.length]
    if (!next) return
    onChange(next.id)
    event.currentTarget.querySelector<HTMLButtonElement>(`#form-tab-${next.id}`)?.focus()
  }

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className="flex gap-2 border-b border-teal-100 px-4 pt-4 sm:px-6"
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            id={`form-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`form-panel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-t-xl px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
              active
                ? 'bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white shadow-sm'
                : 'text-ink-600 hover:bg-teal-50 hover:text-teal-700'
            }`}
          >
            {Icon ? <Icon className="size-4" aria-hidden /> : null}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
