import { FolderKanban, Plus } from 'lucide-react'
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
import { formatNumber, localizeDigits } from '../../lib/datetime'
import {
  jobGroupApi,
  jobGroupEditPath,
  jobGroupNewPath,
  jobGroupPath,
  jobGroupsApi,
} from '../../lib/paths/job-groups'
import type { JobGroup, Paginated } from '../../types/app'

export function JobGroupsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['job-groups', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<JobGroup>>(jobGroupsApi(), {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('menus.jobGroups')}
        subtitle={t('jobGroups.subtitle')}
        action={
          <Link to={jobGroupNewPath()}>
            <Button>
              <Plus className="size-4" />
              {t('jobGroups.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('jobGroups.search')}
        placeholder={t('jobGroups.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('jobGroups.noResults') : t('jobGroups.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('jobGroups.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="code"
                label={t('jobGroups.code')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="jobCount"
                label={t('jobGroups.jobCount')}
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
                <td className="px-4 py-3" dir="ltr">
                  {item.code ? localizeDigits(item.code, locale) : '—'}
                </td>
                <td className="px-4 py-3">{formatNumber(item._count?.jobs ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={jobGroupPath(item.id)}
                    editTo={jobGroupEditPath(item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('jobGroups.confirmDelete'),
                        successMessage: t('jobGroups.deleted'),
                        path: jobGroupApi(item.id),
                        queryKey: ['job-groups'],
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
