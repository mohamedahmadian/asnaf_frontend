import { Plus, Users } from 'lucide-react'
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
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { useGeoName } from '../../lib/geo'
import { RoleBadges } from '../../components/ui/RoleBadges'
import { userStatuses, type AppRole, type ManagedUser, type Paginated } from '../../types/app'

export function UsersListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const geoName = useGeoName()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const status = searchParams.get('status') ?? ''
  const roleId = searchParams.get('roleId') ?? ''

  const roles = useQuery({
    queryKey: ['roles', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<AppRole[]>('/roles')
      return data
    },
  })

  const query = useQuery({
    queryKey: ['users', 'list', q, page, status, roleId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ManagedUser>>('/users', {
        params: {
          q: q || undefined,
          page,
          ...(status ? { status } : {}),
          ...(roleId ? { roleId } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtersActive = Boolean(status || roleId)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Users}
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        action={
          <Link to="/users/new">
            <Button>
              <Plus className="size-4" />
              {t('users.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('users.search')}
        placeholder={t('users.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <>
            <SearchSelect
              value={status}
              onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
              placeholder={t('users.status')}
              options={[
                { value: '', label: t('common.all') },
                { value: userStatuses.ACTIVE, label: t('geo.active') },
                { value: userStatuses.INACTIVE, label: t('geo.inactive') },
              ]}
            />
            <SearchSelect
              value={roleId}
              onChange={(next) => setParams({ roleId: next || undefined }, { resetPage: true })}
              placeholder={t('users.filterRoles')}
              options={[
                { value: '', label: t('users.allRoles') },
                ...(roles.data ?? []).map((role) => ({
                  value: role.id,
                  label: role.name,
                })),
              ]}
            />
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('users.noResults') : t('users.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="fullName" label={t('users.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="username" label={t('users.username')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('users.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('users.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="city" label={t('geo.city')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-start font-medium">{t('users.roles')}</th>
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.fullName}</td>
                <td className="px-4 py-3">{item.username}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? localizeDigits(item.nationalId, locale) : '—'}
                </td>
                <td className="px-4 py-3">
                  {item.phone ? localizeDigits(item.phone, locale) : '—'}
                </td>
                <td className="px-4 py-3">{item.city ? geoName(item.city) : '—'}</td>
                <td className="px-4 py-3">
                  {item.roles?.length ? <RoleBadges roles={item.roles} /> : '—'}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/users/${item.id}`}
                    editTo={`/users/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('users.confirmDelete'),
                        successMessage: t('users.deleted'),
                        path: `/users/${item.id}`,
                        queryKey: ['users'],
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
