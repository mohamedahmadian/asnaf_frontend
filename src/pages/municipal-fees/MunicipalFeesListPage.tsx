import { HandCoins, Plus, ScrollText } from 'lucide-react'
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
import type { FinancialHeading, MunicipalFee, Paginated } from '../../types/app'
import { financialHeadingOptionLabel } from '../financial-headings/FinancialHeadingForm'
import { formatFeeAmount } from './MunicipalFeeForm'

function asHeadingList(data: FinancialHeading[] | Paginated<FinancialHeading>) {
  return Array.isArray(data) ? data : data.items
}

export function MunicipalFeesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const financialHeadingId = searchParams.get('financialHeadingId') ?? ''
  const headingsQuery = useQuery({
    queryKey: ['financial-headings', 'lookup', 'municipal-fees'],
    queryFn: async () => {
      const { data } = await api.get<FinancialHeading[] | Paginated<FinancialHeading>>(
        '/financial-headings',
      )
      return asHeadingList(data)
    },
  })
  const query = useQuery({
    queryKey: ['municipal-fees', 'list', q, financialHeadingId, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<MunicipalFee>>('/municipal-fees', {
        params: {
          q: q || undefined,
          page,
          ...(financialHeadingId ? { financialHeadingId } : {}),
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
        icon={HandCoins}
        title={t('menus.municipalFees')}
        subtitle={t('municipalFees.subtitle')}
        action={
          <Link to="/base-info/municipal-fees/new">
            <Button>
              <Plus className="size-4" />
              {t('municipalFees.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('municipalFees.search')}
        placeholder={t('municipalFees.searchPlaceholder')}
        filtersActive={Boolean(financialHeadingId)}
        extra={
          <FormField
            icon={ScrollText}
            label={t('municipalFees.financialHeading')}
            htmlFor="municipal-fee-heading"
          >
            <SearchSelect
              id="municipal-fee-heading"
              value={financialHeadingId}
              placeholder={t('municipalFees.allFinancialHeadings')}
              onChange={(next) =>
                setParams({ financialHeadingId: next || undefined }, { resetPage: true })
              }
              options={[
                { value: '', label: t('municipalFees.allFinancialHeadings') },
                ...(headingsQuery.data ?? []).map((heading) => ({
                  value: heading.id,
                  label: financialHeadingOptionLabel(heading),
                })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={
          q || financialHeadingId
            ? t('municipalFees.noResults')
            : t('municipalFees.empty')
        }
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('municipalFees.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="amount"
                label={t('municipalFees.amount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="financialHeading"
                label={t('municipalFees.financialHeading')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="description"
                label={t('municipalFees.description')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((fee) => (
              <tr key={fee.id} className="border-t border-line">
                <td className="px-4 py-3">{fee.title}</td>
                <td className="px-4 py-3">{formatFeeAmount(fee.amount, locale)}</td>
                <td className="px-4 py-3">
                  {fee.financialHeading.title}
                </td>
                <td className="px-4 py-3">{fee.description || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/municipal-fees/${fee.id}`}
                    editTo={`/base-info/municipal-fees/${fee.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('municipalFees.confirmDelete'),
                        successMessage: t('municipalFees.deleted'),
                        path: `/municipal-fees/${fee.id}`,
                        queryKey: ['municipal-fees'],
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
