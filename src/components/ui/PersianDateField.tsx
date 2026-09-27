import DatePickerImport, { DateObject } from 'react-multi-date-picker'
import { CalendarDays, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  calendarDayParts,
  datePickerCalendar,
  datePickerLocale,
  fromIsoDateOnly,
  numberingDigits,
  toIsoDateOnly,
  usesJalaliCalendar,
} from '../../lib/datetime'
import { DateEquivalents } from './DateText'
import { fieldClassName } from './Form'
import 'react-multi-date-picker/styles/colors/teal.css'
import 'react-multi-date-picker/styles/layouts/mobile.css'

const DatePicker =
  (DatePickerImport as unknown as { default?: typeof DatePickerImport }).default ??
  DatePickerImport

function dayValue(date: DateObject) {
  return date.year * 10_000 + date.month.number * 100 + date.day
}

function dateInRange(date: DateObject, min?: DateObject, max?: DateObject) {
  const value = dayValue(date)
  if (min && value < dayValue(min)) return false
  if (max && value > dayValue(max)) return false
  return true
}

function hasSelectedDate(selected?: DateObject | DateObject[] | null) {
  if (!selected) return false
  return Array.isArray(selected) ? selected.length > 0 : true
}

function DatePickerActions({
  handleChange,
  handleFocusedDate,
  DatePicker: picker,
  state,
  minDate,
  maxDate,
}: {
  handleChange?: (value: DateObject | DateObject[] | null, nextState?: unknown) => void
  handleFocusedDate?: (date?: DateObject | null) => void
  DatePicker?: { closeCalendar?: () => void }
  state?: {
    calendar?: DateObject['calendar']
    date?: DateObject
    selectedDate?: DateObject | DateObject[] | null
  }
  minDate?: DateObject
  maxDate?: DateObject
  position?: string
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const pickerLocale = datePickerLocale(locale)
  const pickerCalendar = datePickerCalendar(locale)
  const selected = hasSelectedDate(state?.selectedDate)

  function todayDate() {
    return new DateObject({
      calendar: state?.calendar ?? pickerCalendar,
      locale: pickerLocale,
    })
  }

  function goToToday() {
    const today = todayDate()
    handleFocusedDate?.(today)
    if (!dateInRange(today, minDate, maxDate)) return
    handleChange?.(today, { ...state, selectedDate: today })
    picker?.closeCalendar?.()
  }

  function clearDate() {
    handleChange?.(null, { ...state, selectedDate: null })
    handleFocusedDate?.(null)
    picker?.closeCalendar?.()
  }

  return (
    <div
      className="flex gap-2 border-t border-line p-2"
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="inline-flex flex-1 items-center justify-center rounded-xl bg-mint-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-mint-600"
        onClick={goToToday}
      >
        {t('common.today')}
      </button>
      <button
        type="button"
        className="inline-flex flex-1 items-center justify-center rounded-xl border border-line bg-white px-2 py-1.5 text-xs font-medium text-ink-700 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!selected}
        onClick={clearDate}
      >
        {t('common.clearDate')}
      </button>
    </div>
  )
}

function CalendarLegend(_props: { position?: string }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const otherLabel = usesJalaliCalendar(locale)
    ? t('common.calendarGregorian')
    : t('common.calendarJalali')

  return (
    <div className="eskan-cal-legend">
      <span className="eskan-cal-legend-item">
        <span className="eskan-cal-legend-swatch eskan-cal-legend-hijri" aria-hidden />
        {t('common.calendarHijri')}
      </span>
      <span className="eskan-cal-legend-item">
        <span className="eskan-cal-legend-swatch eskan-cal-legend-other" aria-hidden />
        {otherLabel}
      </span>
    </div>
  )
}

export function PersianDateField({
  id,
  value,
  onChange,
  minDate,
  maxDate,
  showHijri,
}: {
  id?: string
  value?: string
  onChange: (isoDate?: string) => void
  minDate?: string
  maxDate?: string
  showHijri?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const pickerLocale = datePickerLocale(locale)
  const pickerCalendar = datePickerCalendar(locale)
  const dir = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
  const selected = value
    ? fromIsoDateOnly(value)?.convert(pickerCalendar)
    : undefined
  const min = minDate ? fromIsoDateOnly(minDate)?.convert(pickerCalendar) : undefined
  const max = maxDate ? fromIsoDateOnly(maxDate)?.convert(pickerCalendar) : undefined

  return (
    <div className="w-full space-y-1.5">
      <DatePicker
        value={selected}
        minDate={min}
        maxDate={max}
        calendar={pickerCalendar}
        locale={pickerLocale}
        format="YYYY/M/D"
        digits={locale === 'en' ? undefined : (numberingDigits[locale] ?? numberingDigits.fa)}
        className="teal eskan-triple-cal"
        calendarPosition={dir === 'rtl' ? 'bottom-right' : 'bottom-left'}
        containerClassName="w-full"
        portal
        zIndex={80}
        hideOnScroll
        onOpenPickNewDate={false}
        mapDays={({ date }) => {
          const parts = calendarDayParts(date, locale)
          const friday = usesJalaliCalendar(locale) && date.weekDay?.index === 6
          return {
            className: friday ? 'eskan-cal-friday' : undefined,
            title: `${parts.primary} · ${parts.hijri} · ${parts.other}`,
            children: (
              <div className="eskan-triple-day">
                <div className="eskan-triple-day-primary">{parts.primary}</div>
                <div className="eskan-triple-day-alts" dir="ltr">
                  <div className="eskan-triple-day-hijri">{parts.hijri}</div>
                  <div className="eskan-triple-day-other">{parts.other}</div>
                </div>
              </div>
            ),
          }
        }}
        plugins={[
          <CalendarLegend key="legend" position="top" />,
          <DatePickerActions key="actions" position="bottom" />,
        ]}
        render={(formatted, openCalendar) => (
          <div className={`${fieldClassName} flex items-center gap-1`}>
            <button
              type="button"
              id={id}
              className="min-w-0 flex-1 truncate text-start"
              onClick={openCalendar}
            >
              <span className={formatted ? 'text-ink-900' : 'text-ink-400'}>
                {formatted || t('common.selectDate')}
              </span>
            </button>
            {value ? (
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-cream-100 hover:text-ink-700"
                aria-label={t('common.clearDate')}
                onClick={() => onChange(undefined)}
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center text-teal-600"
              aria-label={t('common.selectDate')}
              onClick={openCalendar}
            >
              <CalendarDays className="size-4" aria-hidden />
            </button>
          </div>
        )}
        onChange={(date: DateObject | DateObject[] | null) => {
          if (!date || Array.isArray(date)) {
            onChange(undefined)
            return
          }
          onChange(toIsoDateOnly(date))
        }}
      />
      {showHijri ? <DateEquivalents value={value} /> : null}
    </div>
  )
}
