import { CalendarRange, ChartColumn, ShieldAlert, Tag } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DateObject } from 'react-multi-date-picker'
import gregorian from 'react-date-object/calendars/gregorian'
import persian from 'react-date-object/calendars/persian'
import gregorian_en from 'react-date-object/locales/gregorian_en'
import gregorian_hi from 'react-date-object/locales/gregorian_hi'
import persian_fa from 'react-date-object/locales/persian_fa'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { languageDir } from '../../i18n'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { ViolationReport } from '../../types/app'

const axisColor = '#6d8482'
const paleBar = '#e5f6f4'
const tickStyle = { fill: axisColor, fontSize: 12, fontFamily: 'inherit' }

function chartId(prefix: string, raw: string) {
  return `${prefix}-${raw.replace(/:/g, '')}`
}

function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-teal-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbfa_100%)] px-1 pb-2 pt-3 shadow-[0_12px_32px_rgba(20,143,138,0.08)]">
      {children}
    </div>
  )
}

function monthLabel(year: number, month: number, locale: string, calendar: ViolationReport['calendar']) {
  const jalali = calendar === 'jalali'
  const date = new DateObject({
    year,
    month,
    day: 1,
    calendar: jalali ? persian : gregorian,
    locale: jalali ? persian_fa : locale === 'hi' ? gregorian_hi : gregorian_en,
  })
  return String(date.month.name)
}

function CountTooltip({
  active,
  payload,
  label,
  locale,
}: {
  active?: boolean
  payload?: { value?: number }[]
  label?: string
  locale: string
}) {
  const value = payload?.[0]?.value
  if (!active || value == null) return null
  return (
    <div
      dir={languageDir(locale)}
      className="rounded-2xl border border-teal-100 bg-white px-3.5 py-2.5 shadow-[0_12px_28px_rgba(20,143,138,0.16)]"
    >
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-teal-700">{formatNumber(value, locale)}</p>
    </div>
  )
}

function CountLabels({ locale }: { locale: string }) {
  return (
    <LabelList
      dataKey="count"
      position="top"
      content={(props) => {
        const view = props as { x?: number; y?: number; width?: number; value?: number | string }
        const value = Number(view.value)
        if (!value || view.x == null || view.y == null) return null
        return (
          <text
            x={view.x + (view.width ?? 0) / 2}
            y={view.y - 8}
            textAnchor="middle"
            fill="#148f8a"
            fontSize={11}
            fontFamily="inherit"
          >
            {localizeDigits(String(value), locale)}
          </text>
        )
      }}
    />
  )
}

function ColumnChart({
  data,
  locale,
  activeIndex,
}: {
  data: { label: string; count: number }[]
  locale: string
  activeIndex?: number
}) {
  const fillId = chartId('bar', useId())
  const activeId = chartId('bar-active', useId())
  return (
    <ChartFrame>
      <div className="h-80 w-full min-w-0" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 12, left: 0, bottom: 4 }} barCategoryGap="28%">
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7aebdc" />
                <stop offset="100%" stopColor="#2ebdb6" />
              </linearGradient>
              <linearGradient id={activeId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3fd6be" />
                <stop offset="100%" stopColor="#148f8a" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#d7f1ee" strokeDasharray="4 7" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={(props) => (
                <text
                  x={props.x}
                  y={props.y}
                  dy={14}
                  textAnchor="middle"
                  fill={axisColor}
                  fontSize={12}
                  fontFamily="inherit"
                  style={{ direction: languageDir(locale), unicodeBidi: 'plaintext' }}
                >
                  {props.payload?.value}
                </text>
              )}
            />
            <YAxis
              allowDecimals={false}
              width={36}
              axisLine={false}
              tickLine={false}
              tick={tickStyle}
              tickFormatter={(value) => localizeDigits(String(value), locale)}
            />
            <Tooltip content={<CountTooltip locale={locale} />} cursor={{ fill: 'rgba(46,189,182,0.07)' }} />
            <Bar dataKey="count" radius={[12, 12, 6, 6]} maxBarSize={34}>
              {data.map((item, index) => (
                <Cell
                  key={item.label}
                  fill={
                    item.count === 0
                      ? paleBar
                      : index === activeIndex
                        ? `url(#${activeId})`
                        : `url(#${fillId})`
                  }
                />
              ))}
              <CountLabels locale={locale} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

function TypeChart({
  data,
  locale,
}: {
  data: { label: string; fullLabel: string; count: number }[]
  locale: string
}) {
  const fillId = chartId('type', useId())
  return (
    <ChartFrame>
      <div className="h-96 w-full min-w-0" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 12, left: 0, bottom: 8 }} barCategoryGap="24%">
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7aebdc" />
                <stop offset="100%" stopColor="#2ebdb6" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#d7f1ee" strokeDasharray="4 7" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              height={78}
              axisLine={false}
              tickLine={false}
              tick={(props) => (
                <text
                  x={props.x}
                  y={props.y}
                  dy={8}
                  textAnchor="end"
                  fill={axisColor}
                  fontSize={12}
                  fontFamily="inherit"
                  transform={`rotate(-32 ${props.x} ${props.y})`}
                  style={{ direction: languageDir(locale), unicodeBidi: 'plaintext' }}
                >
                  {props.payload?.value}
                </text>
              )}
            />
            <YAxis
              allowDecimals={false}
              width={36}
              axisLine={false}
              tickLine={false}
              tick={tickStyle}
              tickFormatter={(value) => localizeDigits(String(value), locale)}
            />
            <Tooltip
              content={(props) => (
                <CountTooltip
                  active={props.active}
                  payload={props.payload as { value?: number }[]}
                  label={String((props.payload?.[0] as { payload?: { fullLabel?: string } } | undefined)?.payload?.fullLabel ?? props.label ?? '')}
                  locale={locale}
                />
              )}
              cursor={{ fill: 'rgba(46,189,182,0.07)' }}
            />
            <Bar dataKey="count" fill={`url(#${fillId})`} radius={[12, 12, 6, 6]} maxBarSize={42}>
              <CountLabels locale={locale} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

export function ViolationReportsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [searchParams, setSearchParams] = useSearchParams()
  const span = searchParams.get('span') === 'all' ? 'all' : 'year'
  const yearParam = searchParams.get('year') ?? ''
  const monthParam = searchParams.get('month') ?? ''

  const query = useQuery({
    queryKey: ['violations', 'report', span, yearParam, monthParam],
    queryFn: async () => {
      const { data } = await api.get<ViolationReport>('/violations/report', {
        params: {
          ...(span === 'all' ? { span: 'all' } : {}),
          ...(yearParam ? { year: yearParam } : {}),
          ...(span === 'year' && monthParam ? { month: monthParam } : {}),
        },
      })
      return data
    },
  })

  const report = query.data
  const yearValue = span === 'all' ? '' : yearParam || (report ? String(report.year) : '')
  const years = report?.years ?? []

  function setSpanYear(next: string) {
    const params = new URLSearchParams(searchParams)
    if (!next) {
      params.set('span', 'all')
      params.delete('year')
      params.delete('month')
    } else {
      params.delete('span')
      params.set('year', next)
    }
    setSearchParams(params)
  }

  function setMonth(next: string) {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('month', next)
    else params.delete('month')
    setSearchParams(params)
  }

  return (
    <div className={listShellClassName}>
      <PageHeader icon={ChartColumn} title={t('menus.violationReports')} subtitle={t('violations.reportsSubtitle')} />
      <FormCard icon={ChartColumn} title={t('menus.violationReports')} subtitle={t('violations.reportsSubtitle')}>
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField icon={CalendarRange} label={t('violations.year')} htmlFor="violation-report-year">
              <SearchSelect
                id="violation-report-year"
                value={yearValue}
                onChange={setSpanYear}
                placeholder={t('violations.allYears')}
                options={[
                  { value: '', label: t('violations.allYears') },
                  ...years.map((year) => ({
                    value: String(year),
                    label: localizeDigits(String(year), locale),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={CalendarRange} label={t('violations.month')} htmlFor="violation-report-month">
              <SearchSelect
                id="violation-report-month"
                value={span === 'all' ? '' : monthParam}
                onChange={setMonth}
                disabled={span === 'all'}
                placeholder={t('violations.allMonths')}
                options={[
                  { value: '', label: t('violations.allMonths') },
                  ...(report
                    ? report.monthly.map((item) => ({
                        value: String(item.month),
                        label: monthLabel(report.year, item.month, locale, report.calendar),
                      }))
                    : []),
                ]}
              />
            </FormField>
          </div>

          <FormFactTile
            icon={ChartColumn}
            label={t('violations.reportTotal')}
            value={formatNumber(report?.total ?? 0, locale)}
            tone="teal"
          />

          <FormSectionTitle icon={ShieldAlert}>{t('violations.reportByStatus')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {(report?.byStatus ?? []).map((item) => (
              <FormFactTile
                key={item.status}
                icon={ShieldAlert}
                label={t(`violationStatuses.${item.status}`)}
                value={formatNumber(item.count, locale)}
                tone={item.count ? 'mint' : 'ink'}
              />
            ))}
          </div>

          <FormSectionTitle icon={Tag}>{t('violations.reportByType')}</FormSectionTitle>
          {report?.byType.length ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                {report.byType.map((item) => (
                  <FormFactTile
                    key={item.id}
                    icon={Tag}
                    label={item.title}
                    value={formatNumber(item.count, locale)}
                    tone="teal"
                  />
                ))}
              </div>
              <TypeChart
                locale={locale}
                data={report.byType.map((item) => ({
                  label: item.title.length > 18 ? `${item.title.slice(0, 18)}…` : item.title,
                  fullLabel: item.title,
                  count: item.count,
                }))}
              />
            </>
          ) : report ? (
            <FormEmptyHint>{t('violations.reportEmpty')}</FormEmptyHint>
          ) : null}

          <FormSectionTitle icon={CalendarRange}>
            {t('violations.reportMonthly')}
            {report ? ` ${localizeDigits(String(report.year), locale)}` : ''}
          </FormSectionTitle>
          {report ? (
            <ColumnChart
              locale={locale}
              activeIndex={report.month == null ? undefined : report.month - 1}
              data={report.monthly.map((item) => ({
                label: monthLabel(report.year, item.month, locale, report.calendar),
                count: item.count,
              }))}
            />
          ) : null}

          <FormSectionTitle icon={ChartColumn}>{t('violations.reportYearly')}</FormSectionTitle>
          {report?.yearly.length ? (
            <ColumnChart
              locale={locale}
              data={[...report.yearly]
                .sort((left, right) => left.year - right.year)
                .map((item) => ({
                  label: localizeDigits(String(item.year), locale),
                  count: item.count,
                }))}
            />
          ) : report ? (
            <FormEmptyHint>{t('violations.reportEmpty')}</FormEmptyHint>
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}
