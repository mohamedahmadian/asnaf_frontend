import { Filter, Plus, Map } from 'lucide-react'
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
import { Button, FormField, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { useGeoName } from '../../lib/geo'
import type { Country, Paginated, Province } from '../../types/app'
import { GeoHas } from './GeoShared'

export function ProvincesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const name = useGeoName()
  const { q, page, term, setTerm, setPage, setParams, searchParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const countryId = searchParams.get('countryId') ?? ''

  const countries = useQuery({
    queryKey: ['countries', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Country[]>('/countries')
      return data
    },
  })

  const query = useQuery({
    queryKey: ['provinces', 'list', q, countryId, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Province>>('/provinces', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(countryId ? { countryId } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  function onSearch() {
    setParams({ q: term.trim() || undefined }, { resetPage: true })
  }

  const rows = query.data?.items ?? []
  const emptyMessage = q || countryId ? t('provinces.noResults') : t('provinces.empty')

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Map}
        title={t('menus.provinces')}
        subtitle={t('provinces.subtitle')}
        action={
          <Link
            to={
              countryId
                ? `/base-info/provinces/new?countryId=${countryId}`
                : '/base-info/provinces/new'
            }
          >
            <Button>
              <Plus className="size-4" />
              {t('provinces.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        inputId="province-search"
        term={term}
        onTermChange={setTerm}
        onSubmit={onSearch}
        label={t('provinces.search')}
        placeholder={t('provinces.searchPlaceholder')}
        filtersActive={Boolean(countryId)}
        extra={
          <FormField icon={Filter} label={t('geo.country')} htmlFor="province-country">
            <SearchSelect
              id="province-country"
              value={countryId}
              placeholder={t('geo.allCountries')}
              onChange={(next) =>
                setParams({ countryId: next || undefined }, { resetPage: true })
              }
              options={[
                { value: '', label: t('geo.allCountries') },
                ...(countries.data ?? []).map((country) => ({
                  value: country.id,
                  label: name(country),
                })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard loading={query.isLoading} empty={emptyMessage} hasRows={rows.length > 0}>
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="nameFa" label={t('geo.nameFa')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="country" label={t('geo.country')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="code" label={t('geo.code')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="cityCount" label={t('geo.cityCount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="hasRailway" label={t('geo.hasRailway')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="hasAirport" label={t('geo.hasAirport')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((province) => (
              <tr key={province.id} className="border-t border-line">
                <td className="px-4 py-3">{province.nameFa}</td>
                <td className="px-4 py-3">{name(province.country)}</td>
                <td className="px-4 py-3">{province.code}</td>
                <td className="px-4 py-3">
                  {formatNumber(province._count?.cities ?? 0, locale)}
                </td>
                <td className="px-4 py-3">
                  <GeoHas value={province.hasRailway} />
                </td>
                <td className="px-4 py-3">
                  <GeoHas value={province.hasAirport} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/provinces/${province.id}`}
                    editTo={`/base-info/provinces/${province.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('provinces.confirmDelete'),
                        successMessage: t('provinces.deleted'),
                        path: `/provinces/${province.id}`,
                        queryKey: ['provinces'],
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
