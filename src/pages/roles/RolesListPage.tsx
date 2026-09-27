import { Plus, Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ActionsTh,
  PaginationBar,
  SearchBar,
  TableCard,
  EntityRowActions,
  SortableTh,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { Button, PageHeader, listShellClassName } from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { isSystemRoleLocked } from '../../lib/roles'
import type { AppRole, Paginated } from '../../types/app'

export function RolesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['roles', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<AppRole>>('/roles', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Shield}
        title={t('menus.roles')}
        subtitle={t('accessRoles.subtitle')}
        action={
          <Link to="/base-info/roles/new">
            <Button>
              <Plus className="size-4" />
              {t('accessRoles.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('accessRoles.search')}
        placeholder={t('accessRoles.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('accessRoles.noResults') : t('accessRoles.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('accessRoles.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="code" label={t('accessRoles.code')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="userCount"
                label={t('accessRoles.userCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((role) => {
              const locked = isSystemRoleLocked(role)
              return (
                <tr key={role.id} className="border-t border-line">
                  <td className="px-4 py-3">{role.name}</td>
                  <td className="px-4 py-3">{role.code}</td>
                  <td className="px-4 py-3">{formatNumber(role._count?.users ?? 0, locale)}</td>
                  <td className={actionsColClassName}>
                    <EntityRowActions
                      viewTo={`/base-info/roles/${role.id}`}
                      editTo={`/base-info/roles/${role.id}/edit`}
                      canDelete={!locked}
                      onDelete={
                        locked
                          ? undefined
                          : () =>
                              confirmDelete({
                                message: t('accessRoles.confirmDelete'),
                                successMessage: t('accessRoles.deleted'),
                                path: `/roles/${role.id}`,
                                queryKey: ['roles'],
                              })
                      }
                    />
                  </td>
                </tr>
              )
            })}
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
