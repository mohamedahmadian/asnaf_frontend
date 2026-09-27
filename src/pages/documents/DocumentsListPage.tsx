import { FileCheck, Plus } from 'lucide-react'
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
import { Button, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import type { DocumentItem, Paginated } from '../../types/app'
import { DocumentFlag } from './DocumentFlag'

export function DocumentsListPage() {
  const { t } = useTranslation()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['documents', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<DocumentItem>>('/documents', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={FileCheck}
        title={t('menus.documents')}
        subtitle={t('documents.subtitle')}
        action={
          <Link to="/base-info/documents/new">
            <Button>
              <Plus className="size-4" />
              {t('documents.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('documents.search')}
        placeholder={t('documents.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('documents.noResults') : t('documents.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('documents.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="isRequired"
                label={t('documents.isRequired')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="gender"
                label={t('documents.gender')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="isFixed"
                label={t('documents.isFixed')}
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
                <td className="px-4 py-3">
                  <DocumentFlag
                    on={item.isRequired}
                    onLabel={t('documents.required')}
                    offLabel={t('documents.optional')}
                  />
                </td>
                <td className="px-4 py-3">{t(`documents.genders.${item.gender}`)}</td>
                <td className="px-4 py-3">
                  <DocumentFlag
                    on={item.isFixed}
                    onLabel={t('documents.fixed')}
                    offLabel={t('documents.notFixed')}
                  />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/documents/${item.id}`}
                    editTo={`/base-info/documents/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('documents.confirmDelete'),
                        successMessage: t('documents.deleted'),
                        path: `/documents/${item.id}`,
                        queryKey: ['documents'],
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
