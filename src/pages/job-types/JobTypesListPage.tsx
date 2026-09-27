import { Briefcase, Plus } from 'lucide-react'
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
import type { JobType, Paginated } from '../../types/app'

function formatFee(value: number | null | undefined, locale: string) {
  if (value == null || !Number.isFinite(value)) return '—'
  return formatGroupedNumber(value, locale)
}

function dailyFee(annualFee: number | null | undefined) {
  if (annualFee == null || !Number.isFinite(annualFee)) return null
  return Math.round(annualFee / 365)
}

export function JobTypesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['job-types', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<JobType>>('/job-types', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Briefcase}
        title={t('menus.jobTypes')}
        subtitle={t('jobTypes.subtitle')}
        action={
          <Link to="/base-info/job-types/new">
            <Button>
              <Plus className="size-4" />
              {t('jobTypes.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('jobTypes.search')}
        placeholder={t('jobTypes.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('jobTypes.noResults') : t('jobTypes.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('jobTypes.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="description"
                label={t('jobTypes.description')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="annualFee"
                label={t('jobTypes.annualFee')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="dailyFee"
                label={t('jobTypes.dailyFee')}
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
                <td className="px-4 py-3">{formatFee(item.annualFee, locale)}</td>
                <td className="px-4 py-3">{formatFee(dailyFee(item.annualFee), locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/job-types/${item.id}`}
                    editTo={`/base-info/job-types/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('jobTypes.confirmDelete'),
                        successMessage: t('jobTypes.deleted'),
                        path: `/job-types/${item.id}`,
                        queryKey: ['job-types'],
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
