import { BadgeCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader, caseShellClassName } from '../../components/ui/Form'
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
import { localizeDigits } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import { issuancePath } from './issuance-path'

type RequestType = 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'STEWARDSHIP' | 'AUCTION'

type IssuanceRow = {
  id: string
  caseFileId: string
  requestId: string
  requestType: RequestType
  requestNumber: string
  fullName: string
  nationalId: string | null
  jobTitle: string | null
  unitTitle: string | null
  trackingCode: string | null
  createdAt: string
}

export function CaseIssuancePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const query = useQuery({
    queryKey: ['cases', 'issuance', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<IssuanceRow>>('/cases/issuance', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const filtered = Boolean(q)

  return (
    <div className={caseShellClassName}>
      <PageHeader icon={BadgeCheck} title={t('menus.caseIssuance')} subtitle={t('cases.issuanceSubtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('cases.issuanceSearch')}
        placeholder={t('cases.issuanceSearchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={filtered ? t('cases.issuanceNoResults') : t('cases.issuanceEmpty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="applicant" label={t('users.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('users.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="job" label={t('cases.job')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="requestType" label={t('cases.requestType')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="requestNumber"
                label={t('cases.requestNumber')}
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
                <td className="px-4 py-3">{item.fullName || '—'}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? (
                    <span dir="ltr" className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-ink-800 ring-1 ring-teal-200">
                      {localizeDigits(item.nationalId, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">{item.jobTitle || '—'}</td>
                <td className="px-4 py-3">{t(`cases.requestTypes.${item.requestType}`)}</td>
                <td className="px-4 py-3">{item.requestNumber}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions viewTo={issuancePath(item)} editTo={undefined} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPageChange={setPage} />
      ) : null}
    </div>
  )
}
