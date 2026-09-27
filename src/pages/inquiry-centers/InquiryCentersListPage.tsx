import { Plus, ScanSearch } from 'lucide-react'
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
import { localizeDigits } from '../../lib/datetime'
import type { InquiryCenter, Paginated } from '../../types/app'

export function InquiryCentersListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['inquiry-centers', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<InquiryCenter>>('/inquiry-centers', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={ScanSearch}
        title={t('menus.inquiryCenters')}
        subtitle={t('inquiryCenters.subtitle')}
        action={
          <Link to="/base-info/inquiry-centers/new">
            <Button>
              <Plus className="size-4" />
              {t('inquiryCenters.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('inquiryCenters.search')}
        placeholder={t('inquiryCenters.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('inquiryCenters.noResults') : t('inquiryCenters.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="name"
                label={t('inquiryCenters.name')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="phone"
                label={t('inquiryCenters.phone')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="officer"
                label={t('inquiryCenters.officer')}
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
                <td className="px-4 py-3" dir="ltr">
                  {item.phone ? localizeDigits(item.phone, locale) : '—'}
                </td>
                <td className="px-4 py-3">{item.officer?.fullName || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/inquiry-centers/${item.id}`}
                    editTo={`/base-info/inquiry-centers/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('inquiryCenters.confirmDelete'),
                        successMessage: t('inquiryCenters.deleted'),
                        path: `/inquiry-centers/${item.id}`,
                        queryKey: ['inquiry-centers'],
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
