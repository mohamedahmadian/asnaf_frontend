import { ScanSearch } from 'lucide-react'
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
  centerName: string
  applicantName: string
  nationalId: string | null
  trackingCode: string | null
  unitTitle: string | null
  jobTitle: string | null
}

const STATUSES: CaseInquiryStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

export function CaseInquiriesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const status = searchParams.get('status') ?? ''
  const query = useQuery({
    queryKey: ['cases', 'inquiries', q, page, status, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<InboxRow>>('/cases/inquiries', {
        params: { q, page, status: status || undefined, ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []

  return (
    <div className={caseShellClassName}>
      <PageHeader icon={ScanSearch} title={t('menus.caseInquiries')} subtitle={t('cases.inquiriesSubtitle')} />
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
        empty={q || status ? t('cases.inquiriesNoResults') : t('cases.inquiriesListEmpty')}
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
                <td className="px-4 py-3">{t(`cases.inquiryStatuses.${item.status}`)}</td>
                <td className="px-4 py-3">
                  <DateText value={item.createdAt} withTime />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions viewTo={`/cases/inquiries/${item.id}`} />
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
