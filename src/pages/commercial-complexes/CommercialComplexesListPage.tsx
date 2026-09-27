import { Building2, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ActionsTh,
  PaginationBar,
  SearchBar,
  TableCard,
  EntityRowActions,
  SortableTh,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { Button, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import {
  commercialComplexApi,
  commercialComplexEditPath,
  commercialComplexNewPath,
  commercialComplexPath,
  commercialComplexesApi,
} from '../../lib/paths/commercial-complexes'
import type { CommercialComplex, Paginated } from '../../types/app'
import { emptyText } from './shared'

export function CommercialComplexesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['commercial-complexes', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CommercialComplex>>(commercialComplexesApi(), {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('menus.commercialComplexes')}
        subtitle={t('commercialComplexes.subtitle')}
        action={
          <Link to={commercialComplexNewPath()}>
            <Button>
              <Plus className="size-4" />
              {t('commercialComplexes.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('commercialComplexes.search')}
        placeholder={t('commercialComplexes.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('commercialComplexes.noResults') : t('commercialComplexes.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('commercialComplexes.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="address" label={t('commercialComplexes.address')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="postalCode"
                label={t('commercialComplexes.postalCode')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="floorCount"
                label={t('commercialComplexes.floorCount')}
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
                <td className="px-4 py-3">{item.name}</td>
                <td className="max-w-xs truncate px-4 py-3">{emptyText(item.address)}</td>
                <td className="px-4 py-3">
                  {item.postalCode ? localizeDigits(item.postalCode, locale) : '—'}
                </td>
                <td className="px-4 py-3">{formatNumber(item._count?.floors ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={commercialComplexPath(item.id)}
                    editTo={commercialComplexEditPath(item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('commercialComplexes.confirmDelete'),
                        successMessage: t('commercialComplexes.deleted'),
                        path: commercialComplexApi(item.id),
                        queryKey: ['commercial-complexes'],
                      })
                    }
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
    </div>
  )
}
