import { Plus, ShieldAlert } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { Button, PageHeader, listShellClassName } from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import type { Paginated, ViolationType } from '../../types/app'

export function ViolationTypesListPage() {
  const { t } = useTranslation()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['violation-types', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ViolationType>>('/violation-types', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={ShieldAlert}
        title={t('menus.violationTypes')}
        subtitle={t('violationTypes.subtitle')}
        action={
          <Link to="/inspection/violation-types/new">
            <Button>
              <Plus className="size-4" />
              {t('violationTypes.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('violationTypes.search')}
        placeholder={t('violationTypes.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('violationTypes.noResults') : t('violationTypes.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('violationTypes.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="description"
                label={t('violationTypes.description')}
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
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.description || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/inspection/violation-types/${item.id}`}
                    editTo={`/inspection/violation-types/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('violationTypes.confirmDelete'),
                        successMessage: t('violationTypes.deleted'),
                        path: `/violation-types/${item.id}`,
                        queryKey: ['violation-types'],
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
