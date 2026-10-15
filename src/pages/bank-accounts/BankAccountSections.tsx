import { Landmark, ScrollText } from 'lucide-react'
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
import { localizeDigits } from '../../lib/datetime'
import type { FinancialHeading, Paginated } from '../../types/app'

export type BankAccountSection = 'info' | 'headings'

export function useBankAccountSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section: BankAccountSection =
    searchParams.get('section') === 'headings' ? 'headings' : 'info'

  function setSection(next: BankAccountSection) {
    const params = new URLSearchParams(searchParams)
    if (next === 'headings') params.set('section', 'headings')
    else params.delete('section')
    setSearchParams(params, { replace: true })
  }

  return { section, setSection }
}

export function accountHeadingsReturnPath(pathname: string) {
  return `${pathname}?section=headings`
}

export function addFinancialHeadingPath(accountId: string, pathname: string) {
  const params = new URLSearchParams({
    bankAccountId: accountId,
    returnTo: accountHeadingsReturnPath(pathname),
  })
  return `/base-info/financial-headings/new?${params.toString()}`
}

function headingLink(headingId: string, mode: 'view' | 'edit', returnTo: string) {
  const params = new URLSearchParams({ returnTo })
  const base = `/base-info/financial-headings/${headingId}`
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
    { id: 'headings', label: t('bankAccounts.headingsTab'), icon: ScrollText },
  ]

  return <FormTabs value={section} onChange={(id) => onChange(id as BankAccountSection)} tabs={tabs} />
}

export function AccountFinancialHeadings({ accountId }: { accountId: string }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { pathname } = useLocation()
  const returnTo = accountHeadingsReturnPath(pathname)
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['financial-headings', 'account', accountId, q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<FinancialHeading>>('/financial-headings', {
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
      id="form-panel-headings"
      aria-labelledby="form-tab-headings"
      className={formCardBodyClassName}
    >
      <SearchBar
        autoFocus={false}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('financialHeadings.search')}
        placeholder={t('bankAccounts.headingsSearchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={
          q ? t('bankAccounts.headingsNoResults') : t('bankAccounts.headingsEmpty')
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
                column="description"
                label={t('financialHeadings.description')}
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
            {rows.map((heading) => (
              <tr key={heading.id} className="border-t border-line">
                <td className="px-4 py-3">{heading.title}</td>
                <td className="px-4 py-3">{heading.description || '—'}</td>
                <td className="px-4 py-3">
                  {heading.paymentId ? localizeDigits(heading.paymentId, locale) : '—'}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={headingLink(heading.id, 'view', returnTo)}
                    editTo={headingLink(heading.id, 'edit', returnTo)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('financialHeadings.confirmDelete'),
                        successMessage: t('financialHeadings.deleted'),
                        path: `/financial-headings/${heading.id}`,
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
