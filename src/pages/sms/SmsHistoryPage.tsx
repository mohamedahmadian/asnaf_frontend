import { CalendarDays, History, MessageSquareText, Phone, Send } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { SmsMessageBodyModal } from '../../components/sms/SmsMessageBodyModal'
import { DateText } from '../../components/ui/DateText'
import { FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import {
  smsMessageSources,
  smsMessageStatuses,
  smsStatusClass,
  type SmsMessageLog,
} from './sms'

export function SmsHistoryPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams, clearParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const status = searchParams.get('status') ?? ''
  const source = searchParams.get('source') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const [viewing, setViewing] = useState<SmsMessageLog | null>(null)

  const query = useQuery({
    queryKey: ['sms-history', q, page, status, source, from, to, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<SmsMessageLog>>('/sms/history', {
        params: {
          q: q || undefined,
          page,
          ...(status ? { status } : {}),
          ...(source ? { source } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtersActive = Boolean(status || source || from || to)

  return (
    <div className={listShellClassName}>
      <PageHeader icon={History} title={t('menus.smsHistory')} subtitle={t('sms.historySubtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('sms.search')}
        placeholder={t('sms.searchPlaceholder')}
        filtersActive={filtersActive}
        onClearFilters={() => clearParams(['status', 'source', 'from', 'to'])}
        extra={
          <>
            <FormField icon={Send} label={t('sms.sendStatus')} htmlFor="sms-history-status">
              <SearchSelect
                id="sms-history-status"
                value={status}
                placeholder={t('sms.allStatuses')}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('sms.allStatuses') },
                  ...smsMessageStatuses.map((item) => ({
                    value: item,
                    label: t(`sms.statuses.${item}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={MessageSquareText} label={t('sms.source')} htmlFor="sms-history-source">
              <SearchSelect
                id="sms-history-source"
                value={source}
                placeholder={t('sms.allSources')}
                onChange={(next) => setParams({ source: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('sms.allSources') },
                  ...smsMessageSources.map((item) => ({
                    value: item,
                    label: t(`sms.sources.${item}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={CalendarDays} label={t('sms.from')} htmlFor="sms-history-from">
              <PersianDateField
                id="sms-history-from"
                value={from}
                onChange={(value) => setParams({ from: value || undefined }, { resetPage: true })}
              />
            </FormField>
            <FormField icon={CalendarDays} label={t('sms.to')} htmlFor="sms-history-to">
              <PersianDateField
                id="sms-history-to"
                value={to}
                onChange={(value) => setParams({ to: value || undefined }, { resetPage: true })}
              />
            </FormField>
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('sms.noResults') : t('sms.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="createdAt"
                label={t('sms.sentAt')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="phone"
                label={t('sms.recipient')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="status"
                label={t('sms.sendStatus')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <DateText value={item.createdAt} withTime />
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <Phone className="size-4 text-teal-600" aria-hidden />
                    {localizeDigits(item.phone, locale)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${smsStatusClass[item.status]}`}
                  >
                    {t(`sms.statuses.${item.status}`)}
                  </span>
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    onView={() => setViewing(item)}
                    viewLabel={t('sms.viewBody')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
      {viewing ? <SmsMessageBodyModal message={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  )
}
