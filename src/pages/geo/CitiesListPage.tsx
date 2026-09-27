import { Filter, Plus, MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ActionsTh,
  PaginationBar,
  SearchBar,
  TableCard,
  EntityRowActions,
  FilterPair,
  SortableTh,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { Button, FormField, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { useGeoName } from '../../lib/geo'
import type { City, Country, Paginated, Province } from '../../types/app'
import { GeoYesNo } from './GeoShared'

export function CitiesListPage() {
  const { t } = useTranslation()
  const name = useGeoName()
  const { q, page, term, setTerm, setPage, setParams, searchParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const countryId = searchParams.get('countryId') ?? ''
  const provinceId = searchParams.get('provinceId') ?? ''

  const countries = useQuery({
    queryKey: ['countries', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Country[]>('/countries')
      return data
    },
  })

  const provinces = useQuery({
    queryKey: ['provinces', 'lookup', countryId],
    enabled: Boolean(countryId),
    queryFn: async () => {
      const { data } = await api.get<Province[]>('/provinces', {
        params: { countryId },
      })
      return data
    },
  })

  const query = useQuery({
    queryKey: ['cities', 'list', q, countryId, provinceId, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<City>>('/cities', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(countryId ? { countryId } : {}),
          ...(provinceId ? { provinceId } : {}),
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
  const emptyMessage = q || countryId || provinceId ? t('cities.noResults') : t('cities.empty')

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={MapPin}
        title={t('menus.cities')}
        subtitle={t('cities.subtitle')}
        action={
          <Link
            to={
              countryId || provinceId
                ? `/base-info/cities/new?${new URLSearchParams({
                    ...(countryId ? { countryId } : {}),
                    ...(provinceId ? { provinceId } : {}),
                  }).toString()}`
                : '/base-info/cities/new'
            }
          >
            <Button>
              <Plus className="size-4" />
              {t('cities.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        inputId="city-search"
        term={term}
        onTermChange={setTerm}
        onSubmit={onSearch}
        label={t('cities.search')}
        placeholder={t('cities.searchPlaceholder')}
        filtersActive={Boolean(countryId || provinceId)}
        extra={
          <FilterPair>
            <FormField icon={Filter} label={t('geo.country')} htmlFor="city-country">
              <SearchSelect
                id="city-country"
                value={countryId}
                placeholder={t('geo.allCountries')}
                onChange={(next) =>
                  setParams(
                    { countryId: next || undefined, provinceId: undefined },
                    { resetPage: true },
                  )
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
            <FormField icon={Filter} label={t('geo.province')} htmlFor="city-province">
              <SearchSelect
                id="city-province"
                value={provinceId}
                disabled={!countryId}
                placeholder={t('geo.allProvinces')}
                onChange={(next) =>
                  setParams({ provinceId: next || undefined }, { resetPage: true })
                }
                options={[
                  { value: '', label: t('geo.allProvinces') },
                  ...(provinces.data ?? []).map((province) => ({
                    value: province.id,
                    label: name(province),
                  })),
                ]}
              />
            </FormField>
          </FilterPair>
        }
      />
      <TableCard loading={query.isLoading} empty={emptyMessage} hasRows={rows.length > 0}>
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="nameFa" label={t('geo.nameFa')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="province" label={t('geo.province')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="country" label={t('geo.country')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="code" label={t('geo.code')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="isProvinceCapital"
                label={t('geo.isProvinceCapital')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((city) => (
              <tr key={city.id} className="border-t border-line">
                <td className="px-4 py-3">{city.nameFa}</td>
                <td className="px-4 py-3">{name(city.province)}</td>
                <td className="px-4 py-3">{name(city.province.country)}</td>
                <td className="px-4 py-3">{city.code}</td>
                <td className="px-4 py-3">
                  <GeoYesNo value={city.isProvinceCapital} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/cities/${city.id}`}
                    editTo={`/base-info/cities/${city.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('cities.confirmDelete'),
                        successMessage: t('cities.deleted'),
                        path: `/cities/${city.id}`,
                        queryKey: ['cities'],
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
