import { CalendarDays, CircleDot, History, Landmark, Layers, ReceiptText, Trash2, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { DateText } from '../../components/ui/DateText'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatGroupedNumber, formatNumber, localizeDigits } from '../../lib/datetime'
import {
  paymentMethods,
  paymentStatuses,
  type BankAccount,
  type Paginated,
  type PaymentGroup,
  type PaymentRecord,
} from '../../types/app'
import { bankAccountOptionLabel } from '../municipal-fees/MunicipalFeeForm'
import { PaymentMethodBadge, PaymentStatusBadge } from './PaymentBadges'
import { asItemList, paymentCaseLabel } from './payment-shared'
import { canDeletePayment, usePaymentDelete } from './usePaymentDelete'

export function PaymentHistoryPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const deletePayment = usePaymentDelete()
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const paymentGroupId = searchParams.get('paymentGroupId') ?? ''
  const bankAccountId = searchParams.get('bankAccountId') ?? ''
  const method = searchParams.get('method') ?? ''
  const status = searchParams.get('status') ?? ''
  const deleted = searchParams.get('deleted') ?? ''

  const groupsQuery = useQuery({
    queryKey: ['payment-groups'],
    queryFn: async () => {
      const { data } = await api.get<PaymentGroup[]>('/payment-groups')
      return data
    },
  })
  const accountsQuery = useQuery({
    queryKey: ['bank-accounts', 'lookup', 'payment-history'],
    queryFn: async () => {
      const { data } = await api.get<BankAccount[] | Paginated<BankAccount>>('/bank-accounts')
      return asItemList(data)
    },
  })
  const query = useQuery({
    queryKey: [
      'payment-history',
      q,
      page,
      from,
      to,
      paymentGroupId,
      bankAccountId,
      method,
      status,
      deleted,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const { data } = await api.get<Paginated<PaymentRecord>>('/payment-history', {
        params: {
          q: q || undefined,
          page,
          from: from || undefined,
          to: to || undefined,
          paymentGroupId: paymentGroupId || undefined,
          bankAccountId: bankAccountId || undefined,
          method: method || undefined,
          status: status || undefined,
          deleted: deleted || undefined,
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtersActive = Boolean(from || to || paymentGroupId || bankAccountId || method || status || deleted)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={History}
        title={t('menus.paymentHistory')}
        subtitle={t('payments.historySubtitle')}
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('payments.search')}
        placeholder={t('payments.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <>
            <FormField icon={CalendarDays} label={t('payments.from')} htmlFor="payment-history-from">
              <PersianDateField
                id="payment-history-from"
                value={from}
                onChange={(value) => setParams({ from: value || undefined }, { resetPage: true })}
              />
            </FormField>
            <FormField icon={CalendarDays} label={t('payments.to')} htmlFor="payment-history-to">
              <PersianDateField
                id="payment-history-to"
                value={to}
                onChange={(value) => setParams({ to: value || undefined }, { resetPage: true })}
              />
            </FormField>
            <FormField icon={Wallet} label={t('payments.method')} htmlFor="payment-history-method">
              <SearchSelect
                id="payment-history-method"
                value={method}
                placeholder={t('payments.allMethods')}
                onChange={(next) => setParams({ method: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('payments.allMethods') },
                  ...paymentMethods.map((item) => ({ value: item, label: t(`payments.methods.${item}`) })),
                ]}
              />
            </FormField>
            <FormField icon={CircleDot} label={t('payments.status')} htmlFor="payment-history-status">
              <SearchSelect
                id="payment-history-status"
                value={status}
                placeholder={t('payments.allStatuses')}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('payments.allStatuses') },
                  ...paymentStatuses.map((item) => ({ value: item, label: t(`payments.statuses.${item}`) })),
                ]}
              />
            </FormField>
            <FormField icon={Layers} label={t('payments.group')} htmlFor="payment-history-group">
              <SearchSelect
                id="payment-history-group"
                value={paymentGroupId}
                placeholder={t('payments.allPaymentGroups')}
                onChange={(next) => setParams({ paymentGroupId: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('payments.allPaymentGroups') },
                  ...(groupsQuery.data ?? []).map((group) => ({ value: group.id, label: group.title })),
                ]}
              />
            </FormField>
            <FormField icon={Landmark} label={t('payments.bankAccount')} htmlFor="payment-history-account">
              <SearchSelect
                id="payment-history-account"
                value={bankAccountId}
                placeholder={t('payments.allAccounts')}
                onChange={(next) => setParams({ bankAccountId: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('payments.allAccounts') },
                  ...(accountsQuery.data ?? []).map((account) => ({
                    value: account.id,
                    label: bankAccountOptionLabel(account, locale, t('geo.inactive')),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Trash2} label={t('payments.deletedFilter')} htmlFor="payment-history-deleted">
              <SearchSelect
                id="payment-history-deleted"
                value={deleted}
                placeholder={t('payments.deletedHidden')}
                onChange={(next) => setParams({ deleted: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('payments.deletedHidden') },
                  { value: 'true', label: t('payments.deletedIncluded') },
                  { value: 'only', label: t('payments.deletedOnly') },
                ]}
              />
            </FormField>
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('payments.noResults') : t('payments.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="receiptNumber" label={t('payments.receiptNumber')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="paidAt" label={t('payments.paidAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="payerName" label={t('payments.payer')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('payments.identityNo')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="caseFile" label={t('payments.caseFile')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="method" label={t('payments.method')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('payments.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="feeCount" label={t('payments.feeCount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="subtotal" label={t('payments.totalAmount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="discountAmount" label={t('payments.discountAmount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="finalAmount" label={t('payments.finalAmount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="receiptCount" label={t('payments.receiptCount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="recordedBy" label={t('payments.recordedBy')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className={`border-t border-line ${item.deletedAt ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 font-medium" dir="ltr">
                  {localizeDigits(item.receiptNumber, locale)}
                </td>
                <td className="px-4 py-3">
                  {item.paidAt ? <DateText value={item.paidAt} withTime /> : <span className="text-ink-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="block">{item.payerName}</span>
                  {item.currentPayerName ? (
                    <span className="block text-xs text-ink-500">
                      {t('payments.currentName', { value: item.currentPayerName })}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 digit-field">
                  {localizeDigits(
                    item.personType === 'LEGAL' ? item.companyNationalId || '' : item.nationalId || '',
                    locale,
                  ) || '—'}
                </td>
                <td className="px-4 py-3">
                  {item.caseFile
                    ? paymentCaseLabel(item.caseFile, locale)
                    : t(item.personType === 'LEGAL' ? 'payments.onCompanyName' : 'payments.onPersonName')}
                </td>
                <td className="px-4 py-3">
                  <PaymentMethodBadge method={item.method} />
                </td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={item.status} deleted={Boolean(item.deletedAt)} />
                </td>
                <td className="px-4 py-3">{formatNumber(item.feeCount, locale)}</td>
                <td className="px-4 py-3">{formatGroupedNumber(item.subtotal, locale)}</td>
                <td className="px-4 py-3">{formatGroupedNumber(item.discountAmount, locale)}</td>
                <td className="px-4 py-3 font-medium">{formatGroupedNumber(item.finalAmount, locale)}</td>
                <td className="px-4 py-3">
                  {item.receiptCount ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                      <ReceiptText className="size-3.5" aria-hidden />
                      {formatNumber(item.receiptCount, locale)}
                    </span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{item.recordedBy.fullName}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/finance/payment-history/${item.id}`}
                    canDelete={canDeletePayment(item)}
                    onDelete={() => deletePayment(item)}
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
