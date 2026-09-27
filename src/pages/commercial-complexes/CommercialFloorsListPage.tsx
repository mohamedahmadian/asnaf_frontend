import { Building2, Layers, Plus } from 'lucide-react'
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
  commercialComplexApi,
  commercialFloorApi,
  commercialFloorEditPath,
  commercialFloorNewPath,
  commercialFloorPath,
  commercialFloorsApi,
} from '../../lib/paths/commercial-complexes'
import type { CommercialComplex, CommercialFloor, Paginated } from '../../types/app'
import { emptyText, useComplexName } from './shared'

export function CommercialFloorsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const name = useComplexName()
  const { complexId = '' } = useParams()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const parent = useQuery({
    queryKey: ['commercial-complex', complexId],
    enabled: Boolean(complexId),
    queryFn: async () => {
      const { data } = await api.get<CommercialComplex>(commercialComplexApi(complexId))
      return data
    },
  })
  const query = useQuery({
    queryKey: ['commercial-floors', complexId, 'list', q, page, sortBy, sortDir],
    enabled: Boolean(complexId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<CommercialFloor>>(commercialFloorsApi(complexId), {
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
        icon={Layers}
        title={t('commercialFloors.title')}
        subtitle={<EntityNameSubtitle name={name(parent.data)} icon={Building2} />}
        action={
          <Link to={commercialFloorNewPath(complexId)}>
            <Button>
              <Plus className="size-4" />
              {t('commercialFloors.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('commercialFloors.search')}
        placeholder={t('commercialFloors.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('commercialFloors.noResults') : t('commercialFloors.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="title" label={t('commercialFloors.titleLabel')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="code" label={t('commercialFloors.code')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="description"
                label={t('commercialFloors.description')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="laneCount"
                label={t('commercialFloors.laneCount')}
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
                <td className="px-4 py-3">{formatNumber(item._count?.lanes ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={commercialFloorPath(complexId, item.id)}
                    editTo={commercialFloorEditPath(complexId, item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('commercialFloors.confirmDelete'),
                        successMessage: t('commercialFloors.deleted'),
                        path: commercialFloorApi(complexId, item.id),
                        queryKey: ['commercial-floors', complexId],
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
