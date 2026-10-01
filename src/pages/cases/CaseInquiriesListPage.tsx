import { ScanSearch, type LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader, caseShellClassName } from '../../components/ui/Form'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { FormField } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { DateText } from '../../components/ui/DateText'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import type { CaseInquiryChannel, CaseInquiryStatus } from './inquiry-types'

type InboxRow = {
  id: string
  status: CaseInquiryStatus
  channel: CaseInquiryChannel | null
  createdAt: string
  decidedAt: string | null
  centerName: string
  applicantName: string
  nationalId: string | null
  trackingCode: string | null
  unitTitle: string | null
  jobTitle: string | null
}

type InboxCenter = {
  id: string
  name: string
}

const STATUSES: CaseInquiryStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

const statusBadgeClass: Record<CaseInquiryStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  APPROVED: 'bg-teal-50 text-teal-800 ring-teal-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
}

export function CaseInquiriesListPage({
  apiPath = '/cases/inquiries',
  viewBase = '/cases/inquiries',
  titleKey = 'menus.caseInquiries',
  subtitleKey = 'cases.inquiriesSubtitle',
  emptyKey = 'cases.inquiriesListEmpty',
  noResultsKey = 'cases.inquiriesNoResults',
  icon: Icon = ScanSearch,
  queryScope = 'inquiries',
}: {
  apiPath?: string
  viewBase?: string
  titleKey?: string
  subtitleKey?: string
  emptyKey?: string
  noResultsKey?: string
  icon?: LucideIcon
  queryScope?: string
} = {}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const status = searchParams.get('status') ?? ''
  const query = useQuery({
    queryKey: ['cases', queryScope, q, page, status, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<InboxRow> & { centers: InboxCenter[] }>(apiPath, {
        params: { q, page, status: status || undefined, ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const centers = query.data?.centers ?? []

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Icon}
        title={t(titleKey)}
        subtitle={
          queryScope === 'places' ? (
            t(subtitleKey)
          ) : centers.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {centers.map((center) => (
                <span
                  key={center.id}
                  className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200"
                >
                  {center.name}
                </span>
              ))}
            </span>
          ) : null
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={applySearch}
        label={t('cases.inquiriesSearch')}
        placeholder={t('cases.inquiriesSearchPlaceholder')}
        filtersActive={Boolean(status)}
        extra={
          <FormField icon={ScanSearch} label={t('cases.inquiryStatus')} htmlFor="inquiry-status-filter">
            <SearchSelect
              id="inquiry-status-filter"
              value={status}
              onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
              placeholder={t('cases.inquiryAllStatuses')}
              options={[
                { value: '', label: t('cases.inquiryAllStatuses') },
                ...STATUSES.map((item) => ({ value: item, label: t(`cases.inquiryStatuses.${item}`) })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || status ? t(noResultsKey) : t(emptyKey)}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="applicant" label={t('users.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('users.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="center" label={t('cases.inquiryCenter')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="job" label={t('cases.activityJob')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('cases.inquiryStatus')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="createdAt" label={t('cases.inquiryCreatedAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="decidedAt" label={t('cases.inquiryDecidedAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.applicantName}</td>
                <td className="px-4 py-3">{item.nationalId ? localizeDigits(item.nationalId, locale) : '—'}</td>
                <td className="px-4 py-3">{item.centerName}</td>
                <td className="px-4 py-3">{item.jobTitle ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass[item.status]}`}
                  >
                    {t(`cases.inquiryStatuses.${item.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <DateText value={item.createdAt} withTime />
                </td>
                <td className="px-4 py-3">
                  <DateText value={item.decidedAt} withTime />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions viewTo={`${viewBase}/${item.id}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      <PaginationBar
        page={query.data?.page ?? page}
        pageSize={query.data?.pageSize ?? 10}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  )
}
