import { Filter, Plus, ScrollText } from 'lucide-react'
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
import { localizeDigits } from '../../lib/datetime'
import type { BankAccount, FinancialHeading, Paginated } from '../../types/app'
import { bankAccountOptionLabel } from '../municipal-fees/MunicipalFeeForm'

function asAccountList(data: BankAccount[] | Paginated<BankAccount>) {
  return Array.isArray(data) ? data : data.items
}

export function FinancialHeadingsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const bankAccountId = searchParams.get('bankAccountId') ?? ''
  const accountsQuery = useQuery({
    queryKey: ['bank-accounts', 'lookup', 'financial-headings'],
    queryFn: async () => {
      const { data } = await api.get<BankAccount[] | Paginated<BankAccount>>('/bank-accounts')
      return asAccountList(data)
    },
  })
  const query = useQuery({
    queryKey: ['financial-headings', 'list', q, bankAccountId, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<FinancialHeading>>('/financial-headings', {
        params: {
          q: q || undefined,
          page,
          ...(bankAccountId ? { bankAccountId } : {}),
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
        icon={ScrollText}
        title={t('menus.financialHeadings')}
        subtitle={t('financialHeadings.subtitle')}
        action={
          <Link to="/base-info/financial-headings/new">
            <Button>
              <Plus className="size-4" aria-hidden />
              {t('financialHeadings.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('financialHeadings.search')}
        placeholder={t('financialHeadings.searchPlaceholder')}
        filtersActive={Boolean(bankAccountId)}
        extra={
          <FormField
            icon={Filter}
            label={t('financialHeadings.bankAccount')}
            htmlFor="financial-heading-account-filter"
          >
            <SearchSelect
              id="financial-heading-account-filter"
              value={bankAccountId}
              placeholder={t('financialHeadings.allAccounts')}
              onChange={(next) =>
                setParams({ bankAccountId: next || undefined }, { resetPage: true })
              }
              options={[
                { value: '', label: t('financialHeadings.allAccounts') },
                ...(accountsQuery.data ?? []).map((account) => ({
                  value: account.id,
                  label: bankAccountOptionLabel(account, locale, t('geo.inactive')),
                })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={
          q || bankAccountId
            ? t('financialHeadings.noResults')
            : t('financialHeadings.empty')
        }
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('financialHeadings.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="bankAccount"
                label={t('financialHeadings.bankAccount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="paymentId"
                label={t('financialHeadings.paymentId')}
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
                <td className="px-4 py-3">
                  {bankAccountOptionLabel(item.bankAccount, locale, t('geo.inactive'))}
                </td>
                <td className="px-4 py-3">
                  {item.paymentId ? localizeDigits(item.paymentId, locale) : '—'}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/financial-headings/${item.id}`}
                    editTo={`/base-info/financial-headings/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('financialHeadings.confirmDelete'),
                        successMessage: t('financialHeadings.deleted'),
                        path: `/financial-headings/${item.id}`,
                        queryKey: ['financial-headings'],
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
