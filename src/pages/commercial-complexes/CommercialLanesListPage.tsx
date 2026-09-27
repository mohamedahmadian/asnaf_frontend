import { Layers, Plus, Rows3 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  ActionsTh,
  PaginationBar,
  SearchBar,
  TableCard,
  EntityRowActions,
  SortableTh,
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
  commercialFloorApi,
  commercialLaneApi,
  commercialLaneEditPath,
  commercialLaneNewPath,
  commercialLanePath,
  commercialLanesApi,
} from '../../lib/paths/commercial-complexes'
import type { CommercialFloor, CommercialLane, Paginated } from '../../types/app'
import { emptyText } from './shared'

export function CommercialLanesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { complexId = '', floorId = '' } = useParams()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const parent = useQuery({
    queryKey: ['commercial-floor', complexId, floorId],
    enabled: Boolean(complexId && floorId),
    queryFn: async () => {
      const { data } = await api.get<CommercialFloor>(commercialFloorApi(complexId, floorId))
      return data
    },
  })
  const query = useQuery({
    queryKey: ['commercial-lanes', complexId, floorId, 'list', q, page, sortBy, sortDir],
    enabled: Boolean(complexId && floorId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<CommercialLane>>(commercialLanesApi(complexId, floorId), {
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
        icon={Rows3}
        title={t('commercialLanes.title')}
        subtitle={<EntityNameSubtitle name={parent.data.title} icon={Layers} />}
        action={
          <Link to={commercialLaneNewPath(complexId, floorId)}>
            <Button>
              <Plus className="size-4" />
              {t('commercialLanes.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('commercialLanes.search')}
        placeholder={t('commercialLanes.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('commercialLanes.noResults') : t('commercialLanes.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="title" label={t('commercialLanes.titleLabel')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="code" label={t('commercialLanes.code')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="description"
                label={t('commercialLanes.description')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="unitCount"
                label={t('commercialLanes.unitCount')}
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
                <td className="px-4 py-3">{localizeDigits(item.code, locale)}</td>
                <td className="max-w-xs truncate px-4 py-3">{emptyText(item.description)}</td>
                <td className="px-4 py-3">{formatNumber(item._count?.units ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={commercialLanePath(complexId, floorId, item.id)}
                    editTo={commercialLaneEditPath(complexId, floorId, item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('commercialLanes.confirmDelete'),
                        successMessage: t('commercialLanes.deleted'),
                        path: commercialLaneApi(complexId, floorId, item.id),
                        queryKey: ['commercial-lanes', complexId, floorId],
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
