import { CalendarDays, ClipboardList, Gavel, Plus, ShieldAlert, Tag } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { DateText } from '../../components/ui/DateText'
import { Button, FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { violationCreatePath, violationEditPath } from '../../lib/paths/violations'
import type { Paginated, Violation, ViolationStatus, ViolationType } from '../../types/app'
import { VIOLATION_STATUSES } from './constants'
import { ProceedingsModal } from './ProceedingsModal'

function TradeInfoCell({
  unit,
  license,
  locale,
}: {
  unit?: string | null
  license?: string | null
  locale: string
}) {
  const title = unit?.trim()
  const number = license?.trim()
  if (!title && !number) return '—'
  return (
    <div className="flex flex-col items-center gap-1">
      {title ? <span className="font-medium text-ink-900">{title}</span> : null}
      {number ? (
        <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
          {localizeDigits(number, locale)}
        </span>
      ) : null}
    </div>
  )
}

const statusBadgeClass: Record<ViolationStatus, string> = {
  REGISTERED: 'bg-teal-50 text-teal-800 ring-teal-200',
  UNDER_REVIEW: 'bg-mint-50 text-teal-900 ring-mint-200',
  NOTICE: 'bg-amber-50 text-amber-800 ring-amber-200',
  REFERRED: 'bg-cream-50 text-ink-700 ring-line',
  VERDICT_ISSUED: 'bg-teal-100 text-teal-900 ring-teal-300',
  CLOSED: 'bg-mint-100 text-teal-900 ring-mint-300',
  DISMISSED: 'bg-red-50 text-red-700 ring-red-200',
}

export function ViolationsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const status = searchParams.get('status') ?? ''
  const violationTypeId = searchParams.get('violationTypeId') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  const types = useQuery({
    queryKey: ['violation-types', 'lookup'],
    queryFn: async () => (await api.get<ViolationType[]>('/violation-types')).data,
  })
  const query = useQuery({
    queryKey: ['violations', 'list', q, page, status, violationTypeId, from, to, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Violation>>('/violations', {
        params: {
          q: q || undefined,
          page,
          ...(status ? { status } : {}),
          ...(violationTypeId ? { violationTypeId } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtered = Boolean(status || violationTypeId || from || to)
  const [proceedings, setProceedings] = useState<Violation | null>(null)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Gavel}
        title={t('menus.violations')}
        subtitle={t('violations.subtitle')}
        action={
          <Link to={violationCreatePath()}>
            <Button>
              <Plus className="size-4" />
              {t('violations.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('violations.search')}
        placeholder={t('violations.searchPlaceholder')}
        filtersActive={filtered}
        extra={
          <>
            <FormField icon={ShieldAlert} label={t('violations.filterStatus')} htmlFor="violation-filter-status">
              <SearchSelect
                id="violation-filter-status"
                value={status}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                placeholder={t('violations.allStatuses')}
                options={[
                  { value: '', label: t('violations.allStatuses') },
                  ...VIOLATION_STATUSES.map((item) => ({
                    value: item,
                    label: t(`violationStatuses.${item}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Tag} label={t('violations.filterType')} htmlFor="violation-filter-type">
              <SearchSelect
                id="violation-filter-type"
                value={violationTypeId}
                onChange={(next) => setParams({ violationTypeId: next || undefined }, { resetPage: true })}
                placeholder={t('violations.allTypes')}
                options={[
                  { value: '', label: t('violations.allTypes') },
                  ...(types.data ?? []).map((item) => ({ value: item.id, label: item.title })),
                ]}
              />
            </FormField>
            <FormField icon={CalendarDays} label={t('violations.from')} htmlFor="violation-filter-from">
              <PersianDateField
                id="violation-filter-from"
                value={from}
                onChange={(value) => setParams({ from: value || undefined }, { resetPage: true })}
              />
            </FormField>
            <FormField icon={CalendarDays} label={t('violations.to')} htmlFor="violation-filter-to">
              <PersianDateField
                id="violation-filter-to"
                value={to}
                onChange={(value) => setParams({ to: value || undefined }, { resetPage: true })}
              />
            </FormField>
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtered ? t('violations.noResults') : t('violations.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="nationalId"
                label={t('violations.nationalId')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="violationType"
                label={t('violations.violationType')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="licenseNumber"
                label={t('violations.tradeInfo')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                align="center"
              />
              <SortableTh
                column="occurredAt"
                label={t('violations.occurredAt')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="status"
                label={t('violations.status')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                align="center"
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div>{localizeDigits(item.nationalId, locale)}</div>
                  {item.person ? (
                    <div className="text-xs text-ink-500">{item.person.fullName}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">{item.violationType.title}</td>
                <td className="px-4 py-3 text-center">
                  <TradeInfoCell
                    unit={item.caseFile?.businessUnitTitle}
                    license={item.caseFile?.licenseNumber}
                    locale={locale}
                  />
                </td>
                <td className="px-4 py-3">
                  <DateText value={item.occurredAt} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusBadgeClass[item.status]}`}
                  >
                    {t(`violationStatuses.${item.status}`)}
                  </span>
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={violationEditPath(item.id)}
                    showView={false}
                    extra={
                      <Button type="button" variant="ghost" onClick={() => setProceedings(item)}>
                        <ClipboardList className="size-4" aria-hidden />
                        {t('violations.proceedingsAction')}
                      </Button>
                    }
                    editTo={violationEditPath(item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('violations.confirmDelete'),
                        successMessage: t('violations.deleted'),
                        path: `/violations/${item.id}`,
                        queryKey: ['violations'],
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
      {proceedings ? (
        <ProceedingsModal
          violationId={proceedings.id}
          personName={proceedings.person?.fullName ?? null}
          nationalId={proceedings.nationalId}
          onClose={() => setProceedings(null)}
        />
      ) : null}
    </div>
  )
}
