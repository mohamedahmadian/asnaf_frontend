import { HardHat, Plus } from 'lucide-react'
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
import { formatGroupedNumber } from '../../lib/datetime'
import { jobCatalogApi, jobCatalogEditPath, jobCatalogNewPath, jobCatalogPath, jobsCatalogApi } from '../../lib/paths/jobs'
import type { Job, Paginated } from '../../types/app'

function dailyFee(annualFee: number | null | undefined) {
  if (annualFee == null || !Number.isFinite(annualFee)) return null
  return Math.round(annualFee / 365)
}

export function JobsCatalogListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['jobs-catalog', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Job>>(jobsCatalogApi(), {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={HardHat}
        title={t('menus.jobs')}
        subtitle={t('jobCatalog.subtitle')}
        action={
          <Link to={jobCatalogNewPath()}>
            <Button>
              <Plus className="size-4" />
              {t('jobCatalog.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('jobCatalog.search')}
        placeholder={t('jobCatalog.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('jobCatalog.noResults') : t('jobCatalog.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('jobCatalog.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="jobType"
                label={t('jobCatalog.jobType')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="annualFee"
                label={t('jobCatalog.listAnnualFee')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="group"
                label={t('jobCatalog.jobGroup')}
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
                <td className="px-4 py-3">{item.title || '—'}</td>
                <td className="px-4 py-3">{item.jobType.title}</td>
                <td className="px-4 py-3">
                  {item.annualFee == null ? (
                    '—'
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {formatGroupedNumber(item.annualFee, locale)}
                      <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                        {t('jobCatalog.dailyFee')} {formatGroupedNumber(dailyFee(item.annualFee) ?? 0, locale)}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{item.group.title}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={jobCatalogPath(item.id)}
                    editTo={jobCatalogEditPath(item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('jobCatalog.confirmDelete'),
                        successMessage: t('jobCatalog.deleted'),
                        path: jobCatalogApi(item.id),
                        queryKey: ['jobs-catalog'],
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
