import {
  AlarmClock,
  BadgeCheck,
  CalendarClock,
  CalendarRange,
  ChartColumn,
  CircleCheck,
  CircleX,
  Clock3,
  FolderInput,
  Hourglass,
  Landmark,
  ScanSearch,
  Percent,
  Timer,
  UserRound,
  Users,
} from 'lucide-react'
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
import { DateText } from '../../components/ui/DateText'
import { FormField, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { ActionsTh, EntityRowActions, TableCard, actionsColClassName } from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { languageDir } from '../../i18n'
import { useAuth } from '../../auth/AuthProvider'
import { api } from '../../lib/api'
import { inquiryMenuTitle } from '../../lib/inquiry-menu-label'
import { hasPermission, isAdmin } from '../../lib/roles'
import { formatNumber, localizeDigits } from '../../lib/datetime'

const axisColor = '#6d8482'
const paleBar = '#e5f6f4'
const tickStyle = { fill: axisColor, fontSize: 12, fontFamily: 'inherit' }

type PlacesMetric = { value: number; previous: number; delta: number }
type PlacesRate = { value: number | null; previous: number | null; delta: number | null }

type PlacesReport = {
  calendar: 'jalali' | 'gregorian'
  year: number
  month: number | null
  previousYear: number
  previousMonth: number | null
  years: number[]
  responseDays: number
  centerId: string | null
  centers: { id: string; name: string }[]
  volume: {
    referred: PlacesMetric
    decided: PlacesMetric
    openEnd: PlacesMetric
    approved: PlacesMetric
    rejected: PlacesMetric
    resolutionRate: PlacesRate
  }
  monthly: { month: number; referred: number; decided: number }[]
  weeklyMonth: number
  weekly: { week: number; referred: number; decided: number }[]
  byType: {
    type: 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'STEWARDSHIP'
    referred: number
    decided: number
    avgDays: number | null
  }[]
  byCenter: {
    id: string
    name: string
    referred: number
    decided: number
    avgDays: number | null
  }[]
  timing: {
    count: number
    mean: number | null
    median: number | null
    max: number | null
  }
  backlog: {
    pending: number
    onTime: number
    near: number
    overdue: number
    longestDays: number | null
    buckets: { key: 'd1' | 'd4' | 'd8' | 'd15'; count: number }[]
    items: {
      reviewId: string
      caseFileId: string
      fullName: string
      nationalId: string
      trackingCode: string | null
      requestType: string
      centerName: string
      referredAt: string
      ageDays: number
      overdueDays: number
    }[]
    hidden: number
  }
  officers: {
    id: string
    fullName: string
    decided: number
    approved: number
    rejected: number
    avgDays: number | null
  }[]
}

function chartId(prefix: string, raw: string) {
  return `${prefix}-${raw.replace(/:/g, '')}`
}

function monthLabel(year: number, month: number, locale: string, calendar: PlacesReport['calendar']) {
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

function formatQuantity(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function formatDays(value: number | null, locale: string) {
  if (value == null) return '—'
  return localizeDigits(formatQuantity(value), locale)
}

function formatDuration(
  value: number | null,
  locale: string,
  t: (key: string, options?: Record<string, string>) => string,
) {
  if (value == null) return '—'
  if (value < 1) {
    return t('cases.inquiryReport.hoursValue', {
      value: localizeDigits(formatQuantity(value * 24), locale),
    })
  }
  return t('cases.inquiryReport.daysValue', { value: formatDays(value, locale) })
}

function signedNumber(delta: number, locale: string) {
  const abs = formatNumber(Math.abs(delta), locale)
  if (delta > 0) return `+${abs}`
  if (delta < 0) return `−${abs}`
  return abs
}

function DeltaLine({
  delta,
  period,
  locale,
  suffix = '',
}: {
  delta: number | null
  period: string
  locale: string
  suffix?: string
}) {
  const { t } = useTranslation()
  if (delta == null) return null
  return (
    <span className="mt-0.5 block text-[11px] text-ink-500">
      {t('cases.inquiryReport.delta', { value: `${signedNumber(delta, locale)}${suffix}`, period })}
    </span>
  )
}

function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-teal-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbfa_100%)] px-1 pb-2 pt-3 shadow-[0_12px_32px_rgba(20,143,138,0.08)]">
      {children}
    </div>
  )
}

function FlowTooltip({
  active,
  payload,
  label,
  locale,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ name?: string; value?: unknown; color?: string }>
  label?: string
  locale: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      dir={languageDir(locale)}
      className="rounded-2xl border border-teal-100 bg-white px-3.5 py-2.5 shadow-[0_12px_28px_rgba(20,143,138,0.16)]"
    >
      <p className="text-xs text-ink-500">{label}</p>
      {payload.map((item) => {
        const value = typeof item.value === 'number' ? item.value : null
        if (value == null) return null
        return (
          <p key={item.name} className="mt-0.5 text-sm font-semibold text-teal-700">
            {item.name}: {formatNumber(value, locale)}
          </p>
        )
      })}
    </div>
  )
}

function FlowChart({
  data,
  locale,
  referredLabel,
  decidedLabel,
}: {
  data: { label: string; referred: number; decided: number }[]
  locale: string
  referredLabel: string
  decidedLabel: string
}) {
  const referredId = chartId('in', useId())
  const decidedId = chartId('out', useId())
  return (
    <ChartFrame>
      <div className="mb-1 flex items-center justify-center gap-4 px-3 text-xs text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-teal-500" />
          {referredLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-mint-500" />
          {decidedLabel}
        </span>
      </div>
      <div className="h-80 w-full min-w-0" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 12, left: 0, bottom: 4 }} barGap={4} barCategoryGap="22%">
            <defs>
              <linearGradient id={referredId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7aebdc" />
                <stop offset="100%" stopColor="#2ebdb6" />
              </linearGradient>
              <linearGradient id={decidedId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b8ffe9" />
                <stop offset="100%" stopColor="#3fd6be" />
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
            <Tooltip content={<FlowTooltip locale={locale} />} cursor={{ fill: 'rgba(46,189,182,0.07)' }} />
            <Bar dataKey="referred" name={referredLabel} radius={[10, 10, 6, 6]} maxBarSize={26}>
              {data.map((item) => (
                <Cell key={`in-${item.label}`} fill={item.referred === 0 ? paleBar : `url(#${referredId})`} />
              ))}
              <LabelList
                dataKey="referred"
                position="top"
                content={(props) => {
                  const view = props as { x?: number; y?: number; width?: number; value?: number | string }
                  const value = Number(view.value)
                  if (!value || view.x == null || view.y == null) return null
                  return (
                    <text
                      x={view.x + (view.width ?? 0) / 2}
                      y={view.y - 6}
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
            </Bar>
            <Bar dataKey="decided" name={decidedLabel} radius={[10, 10, 6, 6]} maxBarSize={26}>
              {data.map((item) => (
                <Cell key={`out-${item.label}`} fill={item.decided === 0 ? paleBar : `url(#${decidedId})`} />
              ))}
              <LabelList
                dataKey="decided"
                position="top"
                content={(props) => {
                  const view = props as { x?: number; y?: number; width?: number; value?: number | string }
                  const value = Number(view.value)
                  if (!value || view.x == null || view.y == null) return null
                  return (
                    <text
                      x={view.x + (view.width ?? 0) / 2}
                      y={view.y - 6}
                      textAnchor="middle"
                      fill="#0f9b86"
                      fontSize={11}
                      fontFamily="inherit"
                    >
                      {localizeDigits(String(value), locale)}
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

export function CaseInquiriesReportPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const inquiryViewer =
    Boolean(user) && hasPermission(user, 'cases.inquiries') && !hasPermission(user, 'cases.management') && !isAdmin(user)
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [searchParams, setSearchParams] = useSearchParams()
  const yearParam = searchParams.get('year') ?? ''
  const monthParam = searchParams.get('month') ?? ''
  const centerParam = searchParams.get('centerId') ?? ''

  const query = useQuery({
    queryKey: ['cases', 'inquiries-report', yearParam, monthParam, centerParam],
    queryFn: async () => {
      const { data } = await api.get<PlacesReport>('/cases/inquiries/report', {
        params: {
          ...(yearParam ? { year: yearParam } : {}),
          ...(monthParam ? { month: monthParam } : {}),
          ...(centerParam ? { centerId: centerParam } : {}),
        },
      })
      return data
    },
  })

  const report = query.data
  const yearValue = yearParam || (report ? String(report.year) : '')
  const periodLabel = report?.month ? t('cases.inquiryReport.previousMonth') : t('cases.inquiryReport.previousYear')

  function setYear(next: string) {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('year', next)
    else params.delete('year')
    setSearchParams(params)
  }

  function setMonth(next: string) {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('month', next)
    else params.delete('month')
    if (!params.get('year') && report) params.set('year', String(report.year))
    setSearchParams(params)
  }

  function setCenter(next: string) {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('centerId', next)
    else params.delete('centerId')
    setSearchParams(params)
  }

  const calendar = report?.calendar ?? (locale === 'en' || locale === 'hi' ? 'gregorian' : 'jalali')

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={ChartColumn}
        title={inquiryMenuTitle('reports.inquiry-centers', user?.inquiryCenters, t, 'menus.caseInquiriesReports')}
        subtitle={t('cases.inquiryReport.subtitle')}
      />
      <FormCard icon={ScanSearch} title={t('cases.inquiryReport.cardTitle')} subtitle={t('cases.inquiryReport.subtitle')}>
        <div className="space-y-6 p-5 sm:p-6">
          <div className={`grid gap-3 sm:grid-cols-2 ${report && report.centers.length > 1 ? 'lg:grid-cols-3' : ''}`}>
            <FormField icon={CalendarRange} label={t('cases.inquiryReport.year')} htmlFor="places-report-year">
              <SearchSelect
                id="places-report-year"
                value={yearValue}
                onChange={setYear}
                placeholder={t('cases.inquiryReport.year')}
                options={(report?.years ?? []).map((year) => ({
                  value: String(year),
                  label: localizeDigits(String(year), locale),
                }))}
              />
            </FormField>
            <FormField icon={CalendarRange} label={t('cases.inquiryReport.month')} htmlFor="places-report-month">
              <SearchSelect
                id="places-report-month"
                value={monthParam}
                onChange={setMonth}
                placeholder={t('cases.inquiryReport.allMonths')}
                options={[
                  { value: '', label: t('cases.inquiryReport.allMonths') },
                  ...Array.from({ length: 12 }, (_, index) => ({
                    value: String(index + 1),
                    label: monthLabel(report?.year ?? 1400, index + 1, locale, calendar),
                  })),
                ]}
              />
            </FormField>
            {report && report.centers.length > 1 ? (
              <FormField icon={ScanSearch} label={t('cases.inquiryCenter')} htmlFor="inquiries-report-center">
                <SearchSelect
                  id="inquiries-report-center"
                  value={report.centerId ?? ''}
                  onChange={setCenter}
                  placeholder={t('cases.inquiryReport.allCenters')}
                  options={[
                    { value: '', label: t('cases.inquiryReport.allCenters') },
                    ...report.centers.map((center) => ({ value: center.id, label: center.name })),
                  ]}
                />
              </FormField>
            ) : null}
          </div>

          {query.isError ? <FormEmptyHint>{t('cases.inquiryReport.loadError')}</FormEmptyHint> : null}

          {query.isLoading && !report ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-[4.75rem] animate-pulse rounded-2xl bg-teal-50" />
              ))}
            </div>
          ) : null}

          {report ? (
            <>
              <FormSectionTitle icon={ChartColumn}>{t('cases.inquiryReport.volume')}</FormSectionTitle>
              <p className="text-sm text-ink-500">{t('cases.inquiryReport.volumeHint')}</p>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                <FormFactTile
                  icon={FolderInput}
                  label={t('cases.inquiryReport.referred')}
                  tone="teal"
                  value={
                    <>
                      {formatNumber(report.volume.referred.value, locale)}
                      <DeltaLine delta={report.volume.referred.delta} period={periodLabel} locale={locale} />
                    </>
                  }
                />
                <FormFactTile
                  icon={BadgeCheck}
                  label={t('cases.inquiryReport.decided')}
                  tone="mint"
                  value={
                    <>
                      {formatNumber(report.volume.decided.value, locale)}
                      <DeltaLine delta={report.volume.decided.delta} period={periodLabel} locale={locale} />
                    </>
                  }
                />
                <FormFactTile
                  icon={Clock3}
                  label={t('cases.inquiryReport.openEnd')}
                  tone="ink"
                  value={
                    <>
                      {formatNumber(report.volume.openEnd.value, locale)}
                      <DeltaLine delta={report.volume.openEnd.delta} period={periodLabel} locale={locale} />
                    </>
                  }
                />
                <FormFactTile
                  icon={CircleCheck}
                  label={t('cases.inquiryReport.approved')}
                  tone="mint"
                  value={
                    <>
                      {formatNumber(report.volume.approved.value, locale)}
                      <DeltaLine delta={report.volume.approved.delta} period={periodLabel} locale={locale} />
                    </>
                  }
                />
                <FormFactTile
                  icon={CircleX}
                  label={t('cases.inquiryReport.rejected')}
                  tone="ink"
                  value={
                    <>
                      {formatNumber(report.volume.rejected.value, locale)}
                      <DeltaLine delta={report.volume.rejected.delta} period={periodLabel} locale={locale} />
                    </>
                  }
                />
                <FormFactTile
                  icon={Percent}
                  label={t('cases.inquiryReport.resolutionRate')}
                  tone="teal"
                  value={
                    <>
                      {report.volume.resolutionRate.value == null
                        ? '—'
                        : `${formatNumber(report.volume.resolutionRate.value, locale)}٪`}
                      <DeltaLine
                        delta={report.volume.resolutionRate.delta}
                        period={periodLabel}
                        locale={locale}
                        suffix="٪"
                      />
                    </>
                  }
                />
              </div>

              <FormSectionTitle icon={CalendarRange}>
                {t('cases.inquiryReport.monthly')} {localizeDigits(String(report.year), locale)}
              </FormSectionTitle>
              <FlowChart
                locale={locale}
                referredLabel={t('cases.inquiryReport.referredSeries')}
                decidedLabel={t('cases.inquiryReport.decidedSeries')}
                data={report.monthly.map((item) => ({
                  label: monthLabel(report.year, item.month, locale, report.calendar),
                  referred: item.referred,
                  decided: item.decided,
                }))}
              />

              <FormSectionTitle icon={CalendarClock}>
                {t('cases.inquiryReport.weekly', {
                  month: monthLabel(report.year, report.weeklyMonth, locale, report.calendar),
                })}
              </FormSectionTitle>
              <FlowChart
                locale={locale}
                referredLabel={t('cases.inquiryReport.referredSeries')}
                decidedLabel={t('cases.inquiryReport.decidedSeries')}
                data={report.weekly.map((item) => ({
                  label: t('cases.inquiryReport.week', { n: formatNumber(item.week, locale) }),
                  referred: item.referred,
                  decided: item.decided,
                }))}
              />

              <FormSectionTitle icon={Landmark}>{t('cases.inquiryReport.byType')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
                {report.byType.map((item) => (
                  <FormFactTile
                    key={item.type}
                    icon={Landmark}
                    label={t(`cases.requestTypes.${item.type}`)}
                    tone="teal"
                    value={
                      <>
                        {formatNumber(item.referred, locale)}
                        <span className="mt-0.5 block text-[11px] text-ink-500">
                          {item.avgDays == null
                            ? t('cases.inquiryReport.typeMetaNoAvg', {
                                decided: formatNumber(item.decided, locale),
                              })
                            : t('cases.inquiryReport.typeMeta', {
                                decided: formatNumber(item.decided, locale),
                                days: formatDuration(item.avgDays, locale, t),
                              })}
                        </span>
                      </>
                    }
                  />
                ))}
              </div>
              <FlowChart
                locale={locale}
                referredLabel={t('cases.inquiryReport.referredSeries')}
                decidedLabel={t('cases.inquiryReport.decidedSeries')}
                data={report.byType.map((item) => ({
                  label: t(`cases.requestTypes.${item.type}`),
                  referred: item.referred,
                  decided: item.decided,
                }))}
              />

              {report.byCenter.length > 1 ? (
                <>
                  <FormSectionTitle icon={ScanSearch}>{t('cases.inquiryReport.byCenter')}</FormSectionTitle>
                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                    {report.byCenter.map((item) => (
                      <FormFactTile
                        key={item.id}
                        icon={ScanSearch}
                        label={item.name}
                        tone="teal"
                        value={
                          <>
                            {formatNumber(item.referred, locale)}
                            <span className="mt-0.5 block text-[11px] text-ink-500">
                              {item.avgDays == null
                                ? t('cases.inquiryReport.typeMetaNoAvg', {
                                    decided: formatNumber(item.decided, locale),
                                  })
                                : t('cases.inquiryReport.typeMeta', {
                                    decided: formatNumber(item.decided, locale),
                                    days: formatDuration(item.avgDays, locale, t),
                                  })}
                            </span>
                          </>
                        }
                      />
                    ))}
                  </div>
                  <FlowChart
                    locale={locale}
                    referredLabel={t('cases.inquiryReport.referredSeries')}
                    decidedLabel={t('cases.inquiryReport.decidedSeries')}
                    data={report.byCenter.map((item) => ({
                      label: item.name.length > 16 ? `${item.name.slice(0, 16)}…` : item.name,
                      referred: item.referred,
                      decided: item.decided,
                    }))}
                  />
                </>
              ) : null}

              <FormSectionTitle icon={Timer}>{t('cases.inquiryReport.timing')}</FormSectionTitle>
              <p className="text-sm text-ink-500">{t('cases.inquiryReport.timingHint')}</p>
              {report.timing.count ? (
                <>
                  <p className="text-xs text-ink-500">
                    {t('cases.inquiryReport.sample', { count: formatNumber(report.timing.count, locale) })}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                    <FormFactTile
                      icon={Timer}
                      label={t('cases.inquiryReport.mean')}
                      tone="teal"
                      value={formatDuration(report.timing.mean, locale, t)}
                    />
                    <FormFactTile
                      icon={Hourglass}
                      label={t('cases.inquiryReport.median')}
                      tone="mint"
                      value={formatDuration(report.timing.median, locale, t)}
                    />
                    <FormFactTile
                      icon={AlarmClock}
                      label={t('cases.inquiryReport.max')}
                      tone="ink"
                      value={formatDuration(report.timing.max, locale, t)}
                    />
                  </div>
                </>
              ) : (
                <FormEmptyHint>{t('cases.inquiryReport.noDecisions')}</FormEmptyHint>
              )}

              <FormSectionTitle icon={Users}>{t('cases.inquiryReport.officers')}</FormSectionTitle>
              {report.officers.length ? (
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                  {report.officers.map((item) => (
                    <FormFactTile
                      key={item.id}
                      icon={UserRound}
                      label={item.fullName.trim() || t('cases.inquiryReport.unknownOfficer')}
                      tone="teal"
                      value={
                        <>
                          {formatNumber(item.decided, locale)}
                          <span className="mt-0.5 block text-[11px] text-ink-500">
                            {t('cases.inquiryReport.officerMeta', {
                              approved: formatNumber(item.approved, locale),
                              rejected: formatNumber(item.rejected, locale),
                            })}
                            {item.avgDays == null
                              ? ''
                              : ` · ${t('cases.inquiryReport.officerAvg', {
                                  duration: formatDuration(item.avgDays, locale, t),
                                })}`}
                          </span>
                        </>
                      }
                    />
                  ))}
                </div>
              ) : (
                <FormEmptyHint>{t('cases.inquiryReport.noDecisions')}</FormEmptyHint>
              )}

              <FormSectionTitle icon={AlarmClock}>{t('cases.inquiryReport.backlog')}</FormSectionTitle>
              <p className="text-sm text-ink-500">
                {t('cases.inquiryReport.backlogHint', {
                  days: formatNumber(report.responseDays, locale),
                })}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
                <FormFactTile
                  icon={AlarmClock}
                  label={t('cases.inquiryReport.overdue')}
                  tone={report.backlog.overdue ? 'ink' : 'mint'}
                  value={formatNumber(report.backlog.overdue, locale)}
                />
                <FormFactTile
                  icon={Hourglass}
                  label={t('cases.inquiryReport.near')}
                  tone="teal"
                  value={formatNumber(report.backlog.near, locale)}
                />
                <FormFactTile
                  icon={CircleCheck}
                  label={t('cases.inquiryReport.onTime')}
                  tone="mint"
                  value={formatNumber(report.backlog.onTime, locale)}
                />
                <FormFactTile
                  icon={Clock3}
                  label={t('cases.inquiryReport.longest')}
                  tone="ink"
                  value={
                    report.backlog.longestDays == null
                      ? '—'
                      : t('cases.inquiryReport.daysValue', {
                          value: formatNumber(report.backlog.longestDays, locale),
                        })
                  }
                />
              </div>

              <FormSectionTitle icon={CalendarClock}>{t('cases.inquiryReport.buckets')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
                {report.backlog.buckets.map((item) => (
                  <FormFactTile
                    key={item.key}
                    icon={AlarmClock}
                    label={t(`cases.inquiryReport.bucket${item.key}`)}
                    tone={item.count ? 'ink' : 'mint'}
                    value={formatNumber(item.count, locale)}
                  />
                ))}
              </div>

              <FormSectionTitle icon={FolderInput}>{t('cases.inquiryReport.overdueList')}</FormSectionTitle>
              <TableCard empty={t('cases.inquiryReport.overdueEmpty')} hasRows={report.backlog.items.length > 0}>
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium">{t('users.fullName')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('users.nationalId')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('cases.trackingCode')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('cases.inquiryCenter')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('cases.inquiryReport.request')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('cases.placesReferredAt')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('cases.inquiryReport.age')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('cases.inquiryReport.late')}</th>
                      <ActionsTh />
                    </tr>
                  </thead>
                  <tbody>
                    {report.backlog.items.map((item) => (
                      <tr key={item.reviewId} className="border-t border-line">
                        <td className="px-4 py-3">{item.fullName.trim() || '—'}</td>
                        <td className="px-4 py-3">
                          {item.nationalId ? (
                            <span dir="ltr">{localizeDigits(item.nationalId, locale)}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.trackingCode ? (
                            <span dir="ltr">{localizeDigits(item.trackingCode, locale)}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">{item.centerName || '—'}</td>
                        <td className="px-4 py-3">{t(`cases.requestTypes.${item.requestType}`)}</td>
                        <td className="px-4 py-3">
                          <DateText value={item.referredAt} />
                        </td>
                        <td className="px-4 py-3">{formatNumber(item.ageDays, locale)}</td>
                        <td className="px-4 py-3">{formatNumber(item.overdueDays, locale)}</td>
                        <td className={actionsColClassName}>
                          <EntityRowActions
                            viewTo={
                              inquiryViewer
                                ? `/cases/inquiries/${item.reviewId}`
                                : `/cases/${item.caseFileId}?stay=1`
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
              {report.backlog.hidden > 0 ? (
                <p className="text-xs text-ink-500">
                  {t('cases.inquiryReport.overdueMore', { count: formatNumber(report.backlog.hidden, locale) })}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}
