import { CalendarCog } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader, listShellClassName } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { localizeDigits, toLatinDigits } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import { type CaseExpiryRow, caseExpiryEditPath, caseExpiryStatusClass } from './case-expiry'

export function CaseExpiryListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)

  const query = useQuery({
    queryKey: ['case-expiry', q, page, sortBy, sortDir],
    enabled: Boolean(q),
    queryFn: async () => {
      const { data } = await api.get<Paginated<CaseExpiryRow>>('/case-expiry', {
        params: { q, page, ...sortParams },
      })
      return data
    },
  })

  const rows = q ? (query.data?.items ?? []) : []
  const sortProps = { sortBy, sortDir, onSort }

  return (
    <div className={listShellClassName}>
      <PageHeader icon={CalendarCog} title={t('menus.caseExpiry')} subtitle={t('cases.expiry.subtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch(toLatinDigits(term).replace(/\D/g, ''))}
        label={t('cases.expiry.search')}
        placeholder={t('cases.expiry.searchPlaceholder')}
      />
      <TableCard
        loading={Boolean(q) && query.isLoading}
        empty={q ? t('cases.expiry.noResults') : t('cases.expiry.searchHint')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="fullName" label={t('users.fullName')} {...sortProps} />
              <SortableTh column="licenseNumber" label={t('cases.listLicenseNumber')} {...sortProps} />
              <SortableTh column="kind" label={t('cases.expiry.kind')} {...sortProps} />
              <SortableTh column="job" label={t('cases.job')} {...sortProps} />
              <SortableTh column="jobTitle" label={t('cases.listJobTitle')} {...sortProps} />
              <SortableTh column="status" label={t('cases.expiry.status')} {...sortProps} />
              <SortableTh column="issuedAt" label={t('cases.listIssued')} {...sortProps} />
              <SortableTh column="expiresAt" label={t('cases.listExpires')} {...sortProps} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.fullName || '—'}</td>
                <td className="px-4 py-3">
                  {item.licenseNumber ? (
                    <span
                      dir="ltr"
                      className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-teal-900 ring-1 ring-teal-200"
                    >
                      {localizeDigits(item.licenseNumber, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">{t(`cases.expiry.kinds.${item.kind}`)}</td>
                <td className="px-4 py-3">{item.job?.title || '—'}</td>
                <td className="px-4 py-3">{item.jobTitle || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${caseExpiryStatusClass[item.status]}`}
                  >
                    {t(`cases.caseStatuses.${item.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3">{item.issuedAt ? <DateText value={item.issuedAt} /> : '—'}</td>
                <td className="px-4 py-3">{item.expiresAt ? <DateText value={item.expiresAt} /> : '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions viewTo={`/cases/${item.id}`} editTo={caseExpiryEditPath(item.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {q && query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}
