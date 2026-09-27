import { Plus, Globe } from 'lucide-react'
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
import { Button, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { Country, Paginated } from '../../types/app'

export function CountriesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['countries', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Country>>('/countries', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Globe}
        title={t('menus.countries')}
        subtitle={t('countries.subtitle')}
        action={
          <Link to="/base-info/countries/new">
            <Button>
              <Plus className="size-4" />
              {t('countries.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('countries.search')}
        placeholder={t('countries.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('countries.noResults') : t('countries.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="nameFa" label={t('geo.nameFa')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="iso2" label={t('geo.iso2')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phoneCode" label={t('geo.phoneCode')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="provinceCount"
                label={t('geo.provinceCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((country) => (
              <tr key={country.id} className="border-t border-line">
                <td className="px-4 py-3">{country.nameFa}</td>
                <td className="px-4 py-3">{country.iso2}</td>
                <td className="px-4 py-3">
                  {country.phoneCode
                    ? localizeDigits(country.phoneCode, locale)
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {formatNumber(country._count?.provinces ?? 0, locale)}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/countries/${country.id}`}
                    editTo={`/base-info/countries/${country.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('countries.confirmDelete'),
                        successMessage: t('countries.deleted'),
                        path: `/countries/${country.id}`,
                        queryKey: ['countries'],
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
