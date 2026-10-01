import { CalendarRange, ChartColumn, ShieldAlert } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DateObject } from 'react-multi-date-picker'
import gregorian from 'react-date-object/calendars/gregorian'
import persian from 'react-date-object/calendars/persian'
import gregorian_en from 'react-date-object/locales/gregorian_en'
import gregorian_hi from 'react-date-object/locales/gregorian_hi'
import persian_fa from 'react-date-object/locales/persian_fa'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { ViolationReport } from '../../types/app'

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

          <FormSectionTitle icon={CalendarRange}>
            {t('violations.reportMonthly')}
            {report ? ` ${localizeDigits(String(report.year), locale)}` : ''}
          </FormSectionTitle>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t('violations.month')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('violations.count')}</th>
                </tr>
              </thead>
              <tbody>
                {(report?.monthly ?? []).map((item) => (
                  <tr
                    key={item.month}
                    className={`border-t border-line ${
                      report?.month === item.month ? 'bg-teal-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      {report ? monthLabel(report.year, item.month, locale, report.calendar) : item.month}
                    </td>
                    <td className="px-4 py-3">{formatNumber(item.count, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <FormSectionTitle icon={ChartColumn}>{t('violations.reportYearly')}</FormSectionTitle>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t('violations.year')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('violations.count')}</th>
                </tr>
              </thead>
              <tbody>
                {(report?.yearly ?? []).map((item) => (
                  <tr key={item.year} className="border-t border-line">
                    <td className="px-4 py-3">{localizeDigits(String(item.year), locale)}</td>
                    <td className="px-4 py-3">{formatNumber(item.count, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </FormCard>
    </div>
  )
}
