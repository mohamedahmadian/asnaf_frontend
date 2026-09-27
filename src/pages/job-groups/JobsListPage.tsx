import { Briefcase, FolderKanban, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import {
  Button,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  baseInfoFormShellClassName,
} from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import {
  jobApi,
  jobEditPath,
  jobGroupApi,
  jobNewPath,
  jobPath,
  jobsApi,
} from '../../lib/paths/job-groups'
import type { Job, JobGroup, Paginated } from '../../types/app'

export function JobsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { groupId = '' } = useParams()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const parent = useQuery({
    queryKey: ['job-group', groupId],
    enabled: Boolean(groupId),
    queryFn: async () => {
      const { data } = await api.get<JobGroup>(jobGroupApi(groupId))
      return data
    },
  })
  const query = useQuery({
    queryKey: ['jobs', groupId, 'list', q, page, sortBy, sortDir],
    enabled: Boolean(groupId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Job>>(jobsApi(groupId), {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  if (!parent.data) {
    return <LoadingState />
  }

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Briefcase}
        title={t('jobs.title')}
        subtitle={<EntityNameSubtitle name={parent.data.title} icon={FolderKanban} />}
        action={
          <Link to={jobNewPath(groupId)}>
            <Button>
              <Plus className="size-4" />
              {t('jobs.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('jobs.search')}
        placeholder={t('jobs.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('jobs.noResults') : t('jobs.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="title" label={t('jobs.titleLabel')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="code" label={t('jobs.code')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="taxIntaCode"
                label={t('jobs.taxIntaCode')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="jobType"
                label={t('jobs.jobType')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="inquiryCenterCount"
                label={t('jobs.inquiryCenterCount')}
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
                <td className="px-4 py-3" dir="ltr">
                  {localizeDigits(item.code, locale)}
                </td>
                <td className="px-4 py-3" dir="ltr">
                  {item.taxIntaCode ? localizeDigits(item.taxIntaCode, locale) : '—'}
                </td>
                <td className="px-4 py-3">{item.jobType.title}</td>
                <td className="px-4 py-3">{formatNumber(item.inquiryCenters.length, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={jobPath(groupId, item.id)}
                    editTo={jobEditPath(groupId, item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('jobs.confirmDelete'),
                        successMessage: t('jobs.deleted'),
                        path: jobApi(groupId, item.id),
                        queryKey: ['jobs', groupId],
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
