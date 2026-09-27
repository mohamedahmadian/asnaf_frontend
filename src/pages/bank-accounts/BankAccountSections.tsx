import { HandCoins, Landmark } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
import { FormTabs } from '../../components/ui/FormTabs'
import { formCardBodyClassName } from '../../components/ui/FormLayout'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import type { MunicipalFee, Paginated } from '../../types/app'
import { formatFeeAmount } from '../municipal-fees/MunicipalFeeForm'

export type BankAccountSection = 'info' | 'fees'

export function useBankAccountSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section: BankAccountSection = searchParams.get('section') === 'fees' ? 'fees' : 'info'

  function setSection(next: BankAccountSection) {
    const params = new URLSearchParams(searchParams)
    if (next === 'fees') params.set('section', 'fees')
    else params.delete('section')
    setSearchParams(params, { replace: true })
  }

  return { section, setSection }
}

export function accountFeesReturnPath(pathname: string) {
  return `${pathname}?section=fees`
}

export function addMunicipalFeePath(accountId: string, pathname: string) {
  const params = new URLSearchParams({
    bankAccountId: accountId,
    returnTo: accountFeesReturnPath(pathname),
  })
  return `/base-info/municipal-fees/new?${params.toString()}`
}

function feeLink(feeId: string, mode: 'view' | 'edit', returnTo: string) {
  const params = new URLSearchParams({ returnTo })
  const base = `/base-info/municipal-fees/${feeId}`
  return `${mode === 'edit' ? `${base}/edit` : base}?${params.toString()}`
}

export function BankAccountSectionTabs({
  section,
  onChange,
}: {
  section: BankAccountSection
  onChange: (next: BankAccountSection) => void
}) {
  const { t } = useTranslation()
  const tabs: { id: BankAccountSection; label: string; icon: typeof Landmark }[] = [
    { id: 'info', label: t('bankAccounts.accountTab'), icon: Landmark },
    { id: 'fees', label: t('bankAccounts.feesTab'), icon: HandCoins },
  ]

  return <FormTabs value={section} onChange={(id) => onChange(id as BankAccountSection)} tabs={tabs} />
}

export function AccountMunicipalFees({ accountId }: { accountId: string }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { pathname } = useLocation()
  const returnTo = accountFeesReturnPath(pathname)
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['municipal-fees', 'account', accountId, q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<MunicipalFee>>('/municipal-fees', {
        params: {
          bankAccountId: accountId,
          q: q || undefined,
          page,
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div
      role="tabpanel"
      id="form-panel-fees"
      aria-labelledby="form-tab-fees"
      className={formCardBodyClassName}
    >
      <SearchBar
        autoFocus={false}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('municipalFees.search')}
        placeholder={t('bankAccounts.feesSearchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('bankAccounts.feesNoResults') : t('bankAccounts.feesEmpty')}
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
                <td className="px-4 py-3">{fee.description || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={feeLink(fee.id, 'view', returnTo)}
                    editTo={feeLink(fee.id, 'edit', returnTo)}
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
