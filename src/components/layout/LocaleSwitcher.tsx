import { ChevronDown } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { selectableLanguages } from '../../i18n'
import { usePreferredLocale } from '../../hooks/usePreferredLocale'

const MENU_GAP = 4
const VIEW_MARGIN = 8
const MENU_MIN_WIDTH = 160

function LocaleMenu({ tone }: { tone: 'light' | 'onDark' }) {
  const { t } = useTranslation()
  const { locale, setLocale } = usePreferredLocale()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  function placeMenu() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const vv = window.visualViewport
    const viewLeft = vv?.offsetLeft ?? 0
    const viewWidth = vv?.width ?? window.innerWidth
    const viewRight = viewLeft + viewWidth
    const width = Math.min(
      Math.max(rect.width, MENU_MIN_WIDTH),
      viewWidth - VIEW_MARGIN * 2,
    )
    let left = rect.right - width
    if (left < viewLeft + VIEW_MARGIN) left = viewLeft + VIEW_MARGIN
    if (left + width > viewRight - VIEW_MARGIN) {
      left = viewRight - width - VIEW_MARGIN
    }
    setPos({ top: rect.bottom + MENU_GAP, left, width })
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    placeMenu()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onReposition() {
      placeMenu()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const triggerClass =
    tone === 'onDark'
      ? 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/18'
      : 'border border-line bg-white text-ink-700 hover:bg-cream-100'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('settings.locale')}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-2xl px-2.5 py-2 text-xs font-bold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${triggerClass}`}
      >
        <span dir="ltr">{locale.toUpperCase()}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 opacity-70 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-label={t('settings.locale')}
              style={{
                top: pos?.top ?? 0,
                left: pos?.left ?? 0,
                width: pos?.width ?? MENU_MIN_WIDTH,
                visibility: pos ? 'visible' : 'hidden',
              }}
              className="fixed z-[80] overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-[0_16px_40px_rgba(20,40,40,0.12)]"
            >
              {selectableLanguages().map((code) => {
                const selected = locale === code
                return (
                  <button
                    key={code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setLocale(code)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-sm transition focus-visible:outline-none focus-visible:bg-teal-50 ${
                        selected
                          ? 'bg-teal-50 font-medium text-teal-800'
                          : 'text-ink-700 hover:bg-cream-50'
                      }`}
                    >
                      <span dir="ltr" className="w-8 shrink-0 text-xs font-bold tracking-wide text-ink-400">
                        {code.toUpperCase()}
                      </span>
                      <span>{t(`languages.${code}`)}</span>
                    </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export function LocaleSwitcher({
  tone = 'light',
  className,
}: {
  tone?: 'light' | 'onDark'
  className?: string
}) {
  return (
    <div className={className}>
      <LocaleMenu tone={tone} />
    </div>
  )
}
