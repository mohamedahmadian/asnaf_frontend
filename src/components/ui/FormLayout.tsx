import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { peekDetailEditTo } from '../../hooks/useDetailEditTo'
import { CopyableDigits, useCopyDigits } from './CopyableDigits'

export const cardClassName =
  'rounded-[22px] border border-white bg-white shadow-[0_10px_30px_rgba(20,40,40,0.05)]'

export type FormTone = 'teal' | 'mint' | 'ink'

export const formToneClass: Record<FormTone, { wrap: string; icon: string; factIcon: string }> = {
  teal: {
    wrap: 'border-teal-100 bg-gradient-to-b from-teal-50 to-white',
    icon: 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]',
    factIcon: 'bg-teal-100 text-teal-500',
  },
  mint: {
    wrap: 'border-mint-100 bg-gradient-to-b from-mint-50 to-white',
    icon: 'bg-mint-500 text-white shadow-[0_8px_16px_rgba(63,214,190),0.24)]',
    factIcon: 'bg-mint-100 text-mint-500',
  },
  ink: {
    wrap: 'border-line bg-gradient-to-b from-cream-50 to-white',
    icon: 'bg-ink-700 text-white',
    factIcon: 'bg-cream-100 text-ink-500',
  },
}

/** Body padding inside FormCard (around AppForm fields). */
export const formCardBodyClassName = 'space-y-4 p-5 sm:p-6'

function isFormCardInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'a, button, input, textarea, select, [role="button"], [data-enter-ignore], .leaflet-container',
    ),
  )
}

/**
 * Soft admin card with teal/mint gradient header.
 * Wrap every CRUD / entry form (and detail sections) with this shell.
 */
export function FormCard({
  icon,
  title,
  subtitle,
  chips,
  action,
  children,
  className = '',
  headerClassName,
  editTo,
  onDoubleClick,
}: {
  icon: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  chips?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  headerClassName?: string
  /** دابل‌کلیک کارت جزئیات → ویرایش؛ اگر نیاید از `DetailActions` خوانده می‌شود */
  editTo?: string
  onDoubleClick?: () => void
}) {
  const navigate = useNavigate()
  return (
    <section
      className={`${cardClassName} overflow-hidden ${className}`}
      onDoubleClick={(event) => {
        if (isFormCardInteractiveTarget(event.target)) return
        if (onDoubleClick) {
          onDoubleClick()
          return
        }
        const to = editTo ?? peekDetailEditTo()
        if (to) navigate(to)
      }}
    >
      <FormCardHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        chips={chips}
        action={action}
        className={headerClassName}
      />
      {children}
    </section>
  )
}

/** Soft blobs for shared teal/mint card headers. */
export function FormCardHeaderDecor() {
  return (
    <>
      <div
        className="pointer-events-none absolute -start-8 -top-10 size-32 rounded-full bg-teal-200/30"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-6 -bottom-12 size-28 rounded-full bg-mint-100/70"
        aria-hidden
      />
    </>
  )
}

export function FormCardHeader({
  icon: Icon,
  title,
  subtitle,
  chips,
  action,
  heading = 'h2',
  leading,
  className = '',
}: {
  icon: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  chips?: ReactNode
  action?: ReactNode
  heading?: 'h1' | 'h2'
  leading?: ReactNode
  className?: string
}) {
  const Heading = heading
  const titleClass =
    heading === 'h1'
      ? 'text-xl font-semibold leading-snug text-ink-900 sm:text-2xl'
      : 'text-base font-semibold leading-snug text-ink-900'
  const subtitleClass =
    heading === 'h1' ? 'mt-1 text-sm leading-6 text-ink-500' : 'mt-0.5 text-xs leading-5 text-ink-600'
  return (
    <header className={`relative shrink-0 overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-5 sm:px-6 ${className}`}>
      <FormCardHeaderDecor />
      <div className="relative flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {leading}
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_10px_22px_rgba(46,189,182,0.32)]">
            <Icon className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <Heading className={titleClass}>{title}</Heading>
            {subtitle ? <div className={subtitleClass}>{subtitle}</div> : null}
            {chips ? <div className="mt-3 flex flex-wrap gap-1.5">{chips}</div> : null}
          </div>
        </div>
        {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}

export function FormMetaChip({
  icon: Icon,
  label,
  copyValue,
}: {
  icon: LucideIcon
  label?: ReactNode
  copyValue?: string | null
}) {
  const copyDigits = useCopyDigits()
  const canCopy = Boolean(copyValue)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink-700 shadow-[0_4px_10px_rgba(20,40,40,0.05)] ring-1 ring-teal-100 ${
        canCopy ? 'cursor-pointer' : ''
      }`}
      onClick={canCopy ? () => copyDigits(copyValue) : undefined}
    >
      <Icon className="size-3 text-teal-600" aria-hidden />
      {copyValue ? <CopyableDigits value={copyValue} /> : label}
    </span>
  )
}

export function FormSectionTitle({
  icon: Icon,
  children,
  className = 'mb-2.5',
}: {
  icon: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <h3
      className={`inline-flex items-center gap-2 text-xs font-semibold text-ink-600 ${className}`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Icon className="size-3.5" aria-hidden />
      </span>
      {children}
    </h3>
  )
}

export function FormFactTile({
  icon: Icon,
  label,
  value,
  copyValue,
  empty,
  tone = 'teal',
  compact = false,
  className = '',
}: {
  icon: LucideIcon
  label: string
  value?: ReactNode
  copyValue?: string | null
  empty?: boolean
  tone?: FormTone
  compact?: boolean
  className?: string
}) {
  const colors = formToneClass[tone]
  const copyDigits = useCopyDigits()
  const usingCopy = copyValue !== undefined
  const canCopy = Boolean(copyValue)
  const isEmpty = empty ?? (usingCopy && !copyValue)
  const display = usingCopy ? <CopyableDigits value={copyValue} /> : value
  return (
    <article
      className={`relative z-10 flex min-w-0 items-start overflow-hidden rounded-2xl border ${colors.wrap} ${
        compact ? 'gap-2 px-2.5 py-1.5' : 'gap-3 px-3 py-3'
      } ${canCopy ? 'cursor-pointer' : ''} ${className}`}
      onClick={canCopy ? () => copyDigits(copyValue) : undefined}
    >
      <span
        className={`flex shrink-0 items-center justify-center ${colors.factIcon} ${
          compact ? 'mt-px size-7 rounded-lg' : 'mt-0.5 size-8 rounded-xl'
        }`}
      >
        <Icon className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-ink-500">{label}</p>
        <div
          className={`font-semibold break-words ${compact ? 'mt-px text-[13px]' : 'mt-0.5 text-sm'} ${
            isEmpty ? 'text-ink-400' : 'text-ink-900'
          }`}
        >
          {display}
        </div>
      </div>
    </article>
  )
}

export function FormEmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
      {children}
    </p>
  )
}
