import { Filter, HandCoins, Plus } from 'lucide-react'
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
import type { BankAccount, MunicipalFee, Paginated } from '../../types/app'
import { bankAccountOptionLabel, formatFeeAmount } from './MunicipalFeeForm'

function asAccountList(data: BankAccount[] | Paginated<BankAccount>) {
  return Array.isArray(data) ? data : data.items
}

export function MunicipalFeesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const bankAccountId = searchParams.get('bankAccountId') ?? ''
  const accountsQuery = useQuery({
    queryKey: ['bank-accounts', 'lookup', 'municipal-fees'],
    queryFn: async () => {
      const { data } = await api.get<BankAccount[] | Paginated<BankAccount>>('/bank-accounts')
      return asAccountList(data)
    },
  })
  const query = useQuery({
    queryKey: ['municipal-fees', 'list', q, bankAccountId, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<MunicipalFee>>('/municipal-fees', {
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
        filtersActive={Boolean(bankAccountId)}
        extra={
          <FormField icon={Filter} label={t('municipalFees.bankAccount')} htmlFor="municipal-fee-account">
            <SearchSelect
              id="municipal-fee-account"
              value={bankAccountId}
              placeholder={t('municipalFees.allAccounts')}
              onChange={(next) =>
                setParams({ bankAccountId: next || undefined }, { resetPage: true })
              }
              options={[
                { value: '', label: t('municipalFees.allAccounts') },
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
        empty={q || bankAccountId ? t('municipalFees.noResults') : t('municipalFees.empty')}
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
                column="bankAccount"
                label={t('municipalFees.bankAccount')}
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
                  {bankAccountOptionLabel(fee.bankAccount, locale, t('geo.inactive'))}
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
