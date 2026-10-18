import { Landmark, Plus, Star } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { Button, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getApiErrorMessage } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import type { BankAccount, Paginated } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'

export function BankAccountDefaultBadge() {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
      <Star className="size-3 fill-current" aria-hidden />
      {t('bankAccounts.defaultBadge')}
    </span>
  )
}

export function BankAccountsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['bank-accounts', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<BankAccount>>('/bank-accounts', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  async function makeDefault(id: string) {
    setSettingDefaultId(id)
    try {
      await api.post(`/bank-accounts/${id}/default`)
      await queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      await queryClient.invalidateQueries({ queryKey: ['financial-settings'] })
      toast.success(t('bankAccounts.defaultSet'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSettingDefaultId(null)
    }
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Landmark}
        title={t('menus.bankAccounts')}
        subtitle={t('bankAccounts.subtitle')}
        action={
          <Link to="/base-info/bank-accounts/new">
            <Button>
              <Plus className="size-4" />
              {t('bankAccounts.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('bankAccounts.search')}
        placeholder={t('bankAccounts.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('bankAccounts.noResults') : t('bankAccounts.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="bankName"
                label={t('bankAccounts.bankName')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="accountNumber"
                label={t('bankAccounts.accountNumber')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="cardNumber"
                label={t('bankAccounts.cardNumber')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="isDefault"
                label={t('bankAccounts.isDefault')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="isActive"
                label={t('bankAccounts.isActive')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((account) => (
              <tr key={account.id} className="border-t border-line">
                <td className="px-4 py-3">{account.bankName}</td>
                <td className="px-4 py-3" dir="ltr">
                  {localizeDigits(account.accountNumber, locale)}
                </td>
                <td className="px-4 py-3" dir="ltr">
                  {account.cardNumber ? localizeDigits(account.cardNumber, locale) : '—'}
                </td>
                <td className="px-4 py-3">
                  {account.isDefault ? <BankAccountDefaultBadge /> : '—'}
                </td>
                <td className="px-4 py-3">
                  <GeoStatus active={account.isActive} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/base-info/bank-accounts/${account.id}`}
                    showView={false}
                    editTo={`/base-info/bank-accounts/${account.id}/edit`}
                    extra={
                      !account.isDefault && account.isActive ? (
                        <Button
                          type="button"
                          variant="ghost"
                          icon
                          aria-label={t('bankAccounts.makeDefault')}
                          title={t('bankAccounts.makeDefault')}
                          disabled={settingDefaultId !== null}
                          onClick={() => void makeDefault(account.id)}
                        >
                          <Star className="size-4" aria-hidden />
                        </Button>
                      ) : null
                    }
                    onDelete={() =>
                      confirmDelete({
                        message: t('bankAccounts.confirmDelete'),
                        successMessage: t('bankAccounts.deleted'),
                        path: `/bank-accounts/${account.id}`,
                        queryKey: ['bank-accounts'],
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
