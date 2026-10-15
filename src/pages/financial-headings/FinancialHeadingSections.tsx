import { HandCoins, ScrollText } from 'lucide-react'
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
import { GeoStatus } from '../geo/GeoShared'
import { formatFeeAmount } from '../municipal-fees/MunicipalFeeForm'

export type FinancialHeadingSection = 'info' | 'fees'

export function useFinancialHeadingSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section: FinancialHeadingSection =
    searchParams.get('section') === 'fees' ? 'fees' : 'info'

  function setSection(next: FinancialHeadingSection) {
    const params = new URLSearchParams(searchParams)
    if (next === 'fees') params.set('section', 'fees')
    else params.delete('section')
    params.delete('q')
    params.delete('page')
    params.delete('sortBy')
    params.delete('sortDir')
    setSearchParams(params, { replace: true })
  }

  return { section, setSection }
}

export function headingFeesReturnPath(pathname: string) {
  return `${pathname}?section=fees`
}

export function headingFeesReturnTo(value: string | null) {
  if (!value || !value.startsWith('/base-info/financial-headings/')) return null
  if (value.startsWith('//') || value.includes('://') || value.includes('\\')) return null
  return value
}

export function addMunicipalFeePath(headingId: string, pathname: string) {
  const params = new URLSearchParams({
    financialHeadingId: headingId,
    returnTo: headingFeesReturnPath(pathname),
  })
  return `/base-info/municipal-fees/new?${params.toString()}`
}

function feeLink(feeId: string, mode: 'view' | 'edit', returnTo: string) {
  const params = new URLSearchParams({ returnTo })
  const base = `/base-info/municipal-fees/${feeId}`
  return `${mode === 'edit' ? `${base}/edit` : base}?${params.toString()}`
}

export function FinancialHeadingSectionTabs({
  section,
  onChange,
}: {
  section: FinancialHeadingSection
  onChange: (next: FinancialHeadingSection) => void
}) {
  const { t } = useTranslation()
  return (
    <FormTabs
      value={section}
      onChange={(id) => onChange(id as FinancialHeadingSection)}
      tabs={[
        { id: 'info', label: t('financialHeadings.infoTab'), icon: ScrollText },
        { id: 'fees', label: t('financialHeadings.feesTab'), icon: HandCoins },
      ]}
    />
  )
}

export function FinancialHeadingFees({ headingId }: { headingId: string }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { pathname } = useLocation()
  const returnTo = headingFeesReturnPath(pathname)
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['municipal-fees', 'heading', headingId, q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<MunicipalFee>>('/municipal-fees', {
        params: {
          financialHeadingId: headingId,
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
        placeholder={t('financialHeadings.feesSearchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('financialHeadings.feesNoResults') : t('financialHeadings.feesEmpty')}
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
                column="isActive"
                label={t('municipalFees.isActive')}
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
                  <GeoStatus active={fee.isActive} />
                </td>
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
