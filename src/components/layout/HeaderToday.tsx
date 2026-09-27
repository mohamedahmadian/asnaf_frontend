import { CalendarDays } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatGregorianDate,
  formatHijriDate,
  formatJalaliDate,
  formatWeekday,
  todayIsoDate,
} from '../../lib/datetime'

function useTodayIso() {
  const [iso, setIso] = useState(todayIsoDate)

  useEffect(() => {
    let timeoutId = 0
    function schedule() {
      const now = new Date()
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
      )
      timeoutId = window.setTimeout(() => {
        setIso(todayIsoDate())
        schedule()
      }, Math.max(1000, nextMidnight.getTime() - now.getTime()))
    }
    schedule()
    return () => window.clearTimeout(timeoutId)
  }, [])

  return iso
}

function CalendarCol({
  label,
  value,
  dir,
  lang,
  className = '',
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
  lang?: string
  className?: string
}) {
  if (!value) return null
  return (
    <span
      className={`flex min-w-0 flex-col gap-0.5 px-2.5 sm:px-3 ${className}`}
    >
      <span className="text-[10px] font-medium leading-none text-teal-700">{label}</span>
      <span
        className="truncate text-sm font-semibold leading-tight text-ink-900"
        dir={dir}
        lang={lang}
        title={value}
      >
        {value}
      </span>
    </span>
  )
}

export function HeaderToday() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const iso = useTodayIso()
  const weekday = formatWeekday(iso, locale)
  const jalali = formatJalaliDate(iso, locale)
  const hijri = formatHijriDate(iso, locale)
  const gregorian = formatGregorianDate(iso, locale)
  const [expanded, setExpanded] = useState(false)
  const rootRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!expanded) return

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setExpanded(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded])

  return (
    <button
      ref={rootRef}
      type="button"
      aria-expanded={expanded}
      {...(expanded ? { 'data-enter-ignore': '' } : {})}
      aria-label={t('nav.todayCalendars')}
      onClick={() => setExpanded((value) => !value)}
      className="flex cursor-pointer shrink-0 items-center gap-2 overflow-hidden rounded-2xl border border-line bg-white py-1.5 pe-2 ps-1.5 text-start shadow-sm transition hover:border-teal-300 hover:shadow-[0_6px_12px_rgba(46,189,182,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 sm:gap-2.5 sm:py-2 sm:pe-3 sm:ps-2"
    >
      <time dateTime={iso} className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-mint-500 text-white shadow-[0_6px_12px_rgba(46,189,182,0.28)]">
          <CalendarDays className="size-4" aria-hidden />
        </span>
        {weekday ? (
          <span className="flex min-w-0 flex-col justify-center">
            <span className="text-[10px] font-medium leading-none text-ink-400">
              {t('common.today')}
            </span>
            <span className="mt-0.5 truncate text-xs font-semibold leading-tight text-teal-800">
              {weekday}
            </span>
          </span>
        ) : null}
        <span className="flex min-w-0 items-stretch">
          <CalendarCol label={t('common.calendarJalali')} value={jalali} dir="ltr" />
          <span
            className="grid min-w-0 transition-[grid-template-columns] duration-300 ease-out"
            style={{ gridTemplateColumns: expanded ? '1fr' : '0fr' }}
          >
            <span
              className="flex min-w-0 overflow-hidden"
              aria-hidden={!expanded}
              inert={!expanded || undefined}
            >
              <span className="flex w-max items-stretch">
                <CalendarCol
                  className="border-s border-line"
                  label={t('common.calendarHijri')}
                  value={hijri}
                  dir="rtl"
                  lang="ar"
                />
                <CalendarCol
                  className="border-s border-line"
                  label={t('common.calendarGregorian')}
                  value={gregorian}
                  dir="ltr"
                />
              </span>
            </span>
          </span>
        </span>
      </time>
    </button>
  )
}
