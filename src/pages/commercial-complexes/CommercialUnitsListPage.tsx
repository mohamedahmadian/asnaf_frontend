import { Plus, Rows3, Store } from 'lucide-react'
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
import { localizeDigits } from '../../lib/datetime'
import {
  commercialLaneApi,
  commercialUnitApi,
  commercialUnitEditPath,
  commercialUnitNewPath,
  commercialUnitPath,
  commercialUnitsApi,
} from '../../lib/paths/commercial-complexes'
import type { CommercialLane, CommercialUnit, Paginated } from '../../types/app'
import { emptyText } from './shared'

export function CommercialUnitsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { complexId = '', floorId = '', laneId = '' } = useParams()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const parent = useQuery({
    queryKey: ['commercial-lane', complexId, floorId, laneId],
    enabled: Boolean(complexId && floorId && laneId),
    queryFn: async () => {
      const { data } = await api.get<CommercialLane>(commercialLaneApi(complexId, floorId, laneId))
      return data
    },
  })
  const query = useQuery({
    queryKey: ['commercial-units', complexId, floorId, laneId, 'list', q, page, sortBy, sortDir],
    enabled: Boolean(complexId && floorId && laneId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<CommercialUnit>>(
        commercialUnitsApi(complexId, floorId, laneId),
        { params: { q: q || undefined, page, ...sortParams } },
      )
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
        icon={Store}
        title={t('commercialUnits.title')}
        subtitle={<EntityNameSubtitle name={parent.data.title} icon={Rows3} />}
        action={
          <Link to={commercialUnitNewPath(complexId, floorId, laneId)}>
            <Button>
              <Plus className="size-4" />
              {t('commercialUnits.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('commercialUnits.search')}
        placeholder={t('commercialUnits.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('commercialUnits.noResults') : t('commercialUnits.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="plaque" label={t('commercialUnits.plaque')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="code" label={t('commercialUnits.code')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="description"
                label={t('commercialUnits.description')}
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
                <td className="px-4 py-3">{localizeDigits(item.plaque, locale)}</td>
                <td className="px-4 py-3">{localizeDigits(item.code, locale)}</td>
                <td className="max-w-xs truncate px-4 py-3">{emptyText(item.description)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={commercialUnitPath(complexId, floorId, laneId, item.id)}
                    editTo={commercialUnitEditPath(complexId, floorId, laneId, item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('commercialUnits.confirmDelete'),
                        successMessage: t('commercialUnits.deleted'),
                        path: commercialUnitApi(complexId, floorId, laneId, item.id),
                        queryKey: ['commercial-units', complexId, floorId, laneId],
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
