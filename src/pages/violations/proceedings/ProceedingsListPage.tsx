import { ClipboardList, Paperclip, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { DateText } from '../../../components/ui/DateText'
import { Button, PageHeader, listShellClassName } from '../../../components/ui/Form'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import {
  violationProceedingCreatePath,
  violationProceedingEditPath,
  violationProceedingPath,
} from '../../../lib/paths/violations'
import type { Paginated, ViolationProceeding } from '../../../types/app'

export function ProceedingsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id: violationId = '' } = useParams()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['violation-proceedings', violationId, q, page, sortBy, sortDir],
    enabled: Boolean(violationId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ViolationProceeding>>(`/violations/${violationId}/proceedings`, {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('violationProceedings.title')}
        subtitle={t('violationProceedings.subtitle')}
        action={
          <Link to={violationProceedingCreatePath(violationId)}>
            <Button>
              <Plus className="size-4" />
              {t('violationProceedings.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('violationProceedings.search')}
        placeholder={t('violationProceedings.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('violationProceedings.noResults') : t('violationProceedings.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="occurredAt"
                label={t('violationProceedings.occurredAt')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="title"
                label={t('violationProceedings.titleField')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="description"
                label={t('violationProceedings.description')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="attachmentCount"
                label={t('violationProceedings.attachmentCount')}
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
                  <DateText value={item.occurredAt} />
                </td>
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.description || '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <Paperclip className="size-3.5 text-teal-600" aria-hidden />
                    {formatNumber(item._count?.attachments ?? 0, locale)}
                  </span>
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={violationProceedingPath(violationId, item.id)}
                    editTo={violationProceedingEditPath(violationId, item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('violationProceedings.confirmDelete'),
                        successMessage: t('violationProceedings.deleted'),
                        path: `/violations/${violationId}/proceedings/${item.id}`,
                        queryKey: ['violation-proceedings', violationId],
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
