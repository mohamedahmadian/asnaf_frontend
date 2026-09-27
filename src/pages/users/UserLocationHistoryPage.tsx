import { UserRound, History } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import {
  PaginationBar,
  SearchBar,
  TableCard,
  SortableTh,
} from '../../components/ui/ListControls'
import {
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  listShellClassName,
} from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { useGeoName } from '../../lib/geo'
import type { ManagedUser, UserLocationHistoryList } from '../../types/app'

export function UserLocationHistoryPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const geoName = useGeoName()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)

  const userQuery = useQuery({
    queryKey: ['user', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ManagedUser>(`/users/${id}`)
      return data
    },
  })
  const history = useQuery({
    queryKey: ['user-location-history', id, q, page, sortBy, sortDir],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<UserLocationHistoryList>(`/users/${id}/location-history`, {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  if (!userQuery.data) {
    return <LoadingState />
  }

  const rows = history.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={History}
        title={t('location.history')}
        subtitle={<EntityNameSubtitle name={userQuery.data.fullName} icon={UserRound} />}
        backTo={`/users/${id}/location`}
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('location.historySearch')}
        placeholder={t('location.historySearchPlaceholder')}
      />
      <TableCard
        loading={history.isLoading}
        empty={q ? t('location.historyNoResults') : t('location.historyEmpty')}
        hasRows={rows.length > 0}
        rowClick={false}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="createdAt" label={t('location.historyRecordedAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="province" label={t('geo.province')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="city" label={t('geo.city')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="notes" label={t('location.notes')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="source" label={t('location.historySource')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <DateText value={item.createdAt} withTime />
                </td>
                <td className="px-4 py-3">{item.province ? geoName(item.province) : '—'}</td>
                <td className="px-4 py-3">{item.city ? geoName(item.city) : '—'}</td>
                <td className="px-4 py-3">{item.notes || '—'}</td>
                <td className="px-4 py-3">{t(`location.sources.${item.source}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {history.data ? (
        <PaginationBar
          page={history.data.page}
          pageSize={history.data.pageSize}
          total={history.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}
