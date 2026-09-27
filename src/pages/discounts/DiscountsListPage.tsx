import { Filter, Percent, Plus } from 'lucide-react'
import { useMemo } from 'react'
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
import { Button, FormField, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber, persianYearOptions } from '../../lib/datetime'
import type { Discount, Paginated } from '../../types/app'

export function DiscountsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const year = searchParams.get('year') ?? ''
  const yearOptions = useMemo(
    () => persianYearOptions(locale, year ? Number(year) : undefined),
    [locale, year],
  )
  const query = useQuery({
    queryKey: ['discounts', 'list', q, year, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Discount>>('/discounts', {
        params: {
          q: q || undefined,
          page,
          ...(year ? { year } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Percent}
        title={t('menus.discounts')}
        subtitle={t('discounts.subtitle')}
        action={
          <Link to="/base-info/discounts/new">
            <Button>
              <Plus className="size-4" />
              {t('discounts.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('discounts.search')}
        placeholder={t('discounts.searchPlaceholder')}
        filtersActive={Boolean(year)}
        extra={
          <FormField icon={Filter} label={t('discounts.year')} htmlFor="discount-year">
            <SearchSelect
              id="discount-year"
              value={year}
              placeholder={t('discounts.allYears')}
              onChange={(next) => setParams({ year: next || undefined }, { resetPage: true })}
              options={[
                { value: '', label: t('discounts.allYears') },
                ...yearOptions,
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || year ? t('discounts.noResults') : t('discounts.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="year"
                label={t('discounts.year')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="title"
                label={t('discounts.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="percent"
                label={t('discounts.percent')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((discount) => (
              <tr key={discount.id} className="border-t border-line">
                <td className="px-4 py-3">{formatNumber(discount.year, locale)}</td>
                <td className="px-4 py-3">{discount.title}</td>
                <td className="px-4 py-3">
                  {t('discounts.percentValue', { value: formatNumber(discount.percent, locale) })}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/discounts/${discount.id}`}
                    editTo={`/base-info/discounts/${discount.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('discounts.confirmDelete'),
                        successMessage: t('discounts.deleted'),
                        path: `/discounts/${discount.id}`,
                        queryKey: ['discounts'],
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
