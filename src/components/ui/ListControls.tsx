import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatNumber } from '../../lib/datetime'
import { AppForm, Button, cardClassName, fieldClassName } from './Form'
import { LoadingState } from './LoadingState'

export type SortDir = 'asc' | 'desc'

/** Cycles: none → asc → desc → none. Persists via caller (URL params). */
export function nextSortState(
  column: string,
  sortBy: string,
  sortDir: SortDir | '',
): { sortBy?: string; sortDir?: SortDir } {
  if (sortBy !== column || !sortDir) {
    return { sortBy: column, sortDir: 'asc' }
  }
  if (sortDir === 'asc') {
    return { sortBy: column, sortDir: 'desc' }
  }
  return { sortBy: undefined, sortDir: undefined }
}

export function SortableTh({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
  align = 'start',
  className = '',
}: {
  column: string
  label: string
  sortBy: string
  sortDir: SortDir | ''
  onSort: (column: string) => void
  align?: 'start' | 'center'
  className?: string
}) {
  const { t } = useTranslation()
  const active = sortBy === column && (sortDir === 'asc' || sortDir === 'desc')
  const ariaSort = !active ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending'
  const nextHint =
    !active ? t('common.sortAsc') : sortDir === 'asc' ? t('common.sortDesc') : t('common.sortClear')

  return (
    <th
      className={`px-4 py-3 font-medium ${align === 'center' ? 'text-center' : 'text-start'} ${className}`}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        title={nextHint}
        aria-label={`${label} — ${nextHint}`}
        className={`inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 font-medium transition hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
          align === 'center' ? '-mx-1 justify-center' : '-mx-1 text-start'
        } ${active ? 'text-teal-800' : 'text-ink-700'}`}
      >
        <span>{label}</span>
        {active && sortDir === 'asc' ? (
          <ArrowUp className="size-3.5 shrink-0 text-teal-600" aria-hidden />
        ) : active && sortDir === 'desc' ? (
          <ArrowDown className="size-3.5 shrink-0 text-teal-600" aria-hidden />
        ) : (
          <ArrowUpDown className="size-3.5 shrink-0 text-ink-300" aria-hidden />
        )}
      </button>
    </th>
  )
}

const filtersOpenById = new Map<string, boolean>()

export function FilterPair({
  children,
  columns = 2,
}: {
  children: ReactNode
  columns?: 2 | 3
}) {
  return (
    <div
      className={`grid gap-4 sm:col-span-2 ${
        columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
      }`}
    >
      {children}
    </div>
  )
}

function getNavigableRows(root: ParentNode): HTMLTableRowElement[] {
  return Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr')).filter((row) =>
    Boolean(row.querySelector('[data-row-view]')),
  )
}

function activateListRow(row: HTMLElement) {
  row.querySelector<HTMLElement>('[data-row-view]')?.click()
}

function focusListRow(row: HTMLTableRowElement) {
  const root = row.closest('[data-list-table]')
  const rows = root ? getNavigableRows(root) : [row]
  for (const item of rows) {
    item.tabIndex = item === row ? 0 : -1
  }
  row.focus({ preventScroll: true })
  row.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function findListTable(from: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = from.parentElement
  while (el) {
    const tables = Array.from(el.querySelectorAll<HTMLElement>('[data-list-table]')).filter(
      (table) => !from.contains(table),
    )
    if (tables.length) {
      const following = tables.find((table) =>
        Boolean(from.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING),
      )
      return following ?? tables[0]
    }
    el = el.parentElement
  }
  return null
}

function findListSearch(from: HTMLElement): HTMLInputElement | null {
  let el: HTMLElement | null = from.parentElement
  while (el) {
    const inputs = Array.from(el.querySelectorAll<HTMLInputElement>('[data-list-search]'))
    const preceding = inputs.find((input) =>
      Boolean(from.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_PRECEDING),
    )
    if (preceding) return preceding
    el = el.parentElement
  }
  return null
}

export function SearchBar({
  term,
  onTermChange,
  onSubmit,
  label,
  placeholder,
  extra,
  endExtra,
  beside,
  filtersActive = false,
  extraClassName = 'sm:grid-cols-2',
  inputId = 'list-search',
  autoFocus = true,
  hideSubmit = false,
  bare = false,
}: {
  term: string
  onTermChange: (value: string) => void
  onSubmit: () => void
  label: string
  placeholder: string
  extra?: ReactNode
  /** Sits next to the filter button (inline-end of the search row). */
  endExtra?: ReactNode
  beside?: ReactNode
  filtersActive?: boolean
  extraClassName?: string
  inputId?: string
  /** Defaults to true so menu list pages are ready to type after load. */
  autoFocus?: boolean
  hideSubmit?: boolean
  bare?: boolean
}) {
  const { t } = useTranslation()
  const [filtersOpen, setFiltersOpen] = useState(() => filtersOpenById.get(inputId) ?? false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowDown' || event.nativeEvent.isComposing) return
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const table = findListTable(event.currentTarget)
    if (!table) return
    const rows = getNavigableRows(table)
    if (!rows.length) return
    event.preventDefault()
    focusListRow(rows[0])
  }

  function toggleFilters() {
    setFiltersOpen((open) => {
      const next = !open
      filtersOpenById.set(inputId, next)
      return next
    })
  }

  const searchInput = (
    <input
      id={inputId}
      data-list-search=""
      className={`${fieldClassName} min-w-0 ${beside ? 'w-full' : 'w-full sm:w-1/2'}`}
      value={term}
      onChange={(e) => onTermChange(e.target.value)}
      onKeyDown={handleSearchKeyDown}
      placeholder={placeholder}
      title={t('common.searchToTable')}
      aria-label={label}
      autoFocus={autoFocus}
    />
  )
  const searchButton = (
    <Button type="submit" className={`shrink-0 sm:min-w-28 ${beside ? 'w-full lg:w-auto' : ''}`}>
      <Search className="size-4" aria-hidden />
      {t('common.search')}
    </Button>
  )
  const filterButton = extra ? (
    <Button type="button" variant="ghost" aria-expanded={filtersOpen} onClick={toggleFilters}>
      <SlidersHorizontal className="size-4" aria-hidden />
      {t('common.filters')}
      {filtersActive ? <span className="size-2 rounded-full bg-teal-500" aria-hidden /> : null}
      <ChevronDown
        className={`size-4 transition ${filtersOpen ? 'rotate-180' : ''}`}
        aria-hidden
      />
    </Button>
  ) : null
  const endSlot =
    endExtra || filterButton ? (
      <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
        {endExtra}
        {filterButton}
      </div>
    ) : null

  return (
    <AppForm
      data-enter-immediate=""
      autoFocusFirst={autoFocus}
      onSubmit={handleSubmit}
      className={bare ? 'mb-4' : `mb-4 p-4 ${cardClassName}`}
    >
      {beside ? (
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
          {searchInput}
          <div className="grid grid-cols-2 gap-3 lg:contents">{beside}</div>
          {hideSubmit ? null : searchButton}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          {searchInput}
          {hideSubmit ? null : searchButton}
          {endSlot}
        </div>
      )}
      {extra ? (
        <div
          className={`mt-3 grid gap-4 border-t border-line pt-3 ${extraClassName} ${
            filtersOpen ? '' : 'hidden'
          }`}
        >
          {extra}
        </div>
      ) : null}
    </AppForm>
  )
}

/** Shrink-wrap the actions column: content-sized, one row, visual left (RTL last column). */
export const actionsColClassName = 'w-px min-w-max whitespace-nowrap px-4 py-3'

export function ActionsTh({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <th className={`${actionsColClassName} text-start font-medium ${className}`}>
      {t('common.actions')}
    </th>
  )
}

export function EntityRowActions({
  viewTo,
  showView = true,
  viewLabel,
  viewIcon: ViewIcon = Eye,
  extra,
  editTo,
  rowOpensView = false,
  onDelete,
  canDelete = true,
}: {
  viewTo: string
  showView?: boolean
  viewLabel?: string
  viewIcon?: LucideIcon
  extra?: ReactNode
  editTo?: string
  /** If true, row click / Enter opens details instead of edit. */
  rowOpensView?: boolean
  onDelete?: () => void
  canDelete?: boolean
}) {
  const { t } = useTranslation()
  const label = viewLabel ?? t('common.view')
  const rowOpensEdit = Boolean(editTo) && !rowOpensView
  return (
    <div data-row-actions className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
      {showView ? (
        <Link to={viewTo} {...(rowOpensEdit ? {} : { 'data-row-view': '' })}>
          <Button type="button" variant="ghost">
            <ViewIcon className="size-4" aria-hidden />
            {label}
          </Button>
        </Link>
      ) : editTo && !rowOpensView ? null : (
        <Link to={viewTo} data-row-view className="sr-only">
          {label}
        </Link>
      )}
      {extra}
      {editTo ? (
        <Link
          to={editTo}
          {...(rowOpensEdit ? { 'data-row-view': '' } : {})}
          aria-label={t('common.edit')}
          title={t('common.edit')}
        >
          <Button type="button" variant="ghost" icon>
            <Pencil className="size-4" aria-hidden />
          </Button>
        </Link>
      ) : null}
      {canDelete && onDelete ? (
        <Button
          type="button"
          variant="ghost"
          icon
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          aria-label={t('common.delete')}
          title={t('common.delete')}
          onClick={onDelete}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  )
}

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  startExtra,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  startExtra?: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0 && !startExtra) {
    return null
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        {startExtra}
        {total > 0 ? (
          <p className="text-sm text-ink-500">
            {t('common.showingRange', {
              from: formatNumber(from, locale),
              to: formatNumber(to, locale),
              total: formatNumber(total, locale),
            })}
          </p>
        ) : null}
      </div>
      {total > 0 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t('common.prevPage')}
          </Button>
          <span className="min-w-16 text-center text-sm text-ink-700">
            {t('common.pageOf', {
              page: formatNumber(page, locale),
              pages: formatNumber(pageCount, locale),
            })}
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            {t('common.nextPage')}
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function TableCard({
  loading,
  empty,
  hasRows,
  rowClick = true,
  children,
}: {
  loading?: boolean
  empty: string
  hasRows: boolean
  rowClick?: boolean
  children: ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !hasRows) return
    const rows = getNavigableRows(root)
    const active = document.activeElement
    const focusedRow = rows.find((row) => row === active || row.contains(active))
    rows.forEach((row, index) => {
      row.tabIndex = focusedRow ? (row === focusedRow ? 0 : -1) : index === 0 ? 0 : -1
    })
  }, [children, hasRows])

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (!rowClick) return
    const target = event.target as HTMLElement
    if (target.closest('a, button, input, textarea, select, label, [role="button"]')) {
      return
    }
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      return
    }
    const row = target.closest('tbody tr')
    if (!(row instanceof HTMLElement) || !event.currentTarget.contains(row)) {
      return
    }
    activateListRow(row)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const key = event.key
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter') return
    if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return

    const target = event.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return

    const activeRow = target.closest('tbody tr')
    if (!(activeRow instanceof HTMLTableRowElement)) return

    const rows = getNavigableRows(event.currentTarget)
    const idx = rows.indexOf(activeRow)
    if (idx < 0) return

    if (key === 'Enter') {
      if (event.shiftKey) return
      if (target.closest('a, button')) return
      event.preventDefault()
      activateListRow(activeRow)
      return
    }

    event.preventDefault()
    if (key === 'ArrowDown') {
      focusListRow(rows[Math.min(idx + 1, rows.length - 1)])
      return
    }
    if (idx <= 0) {
      findListSearch(event.currentTarget)?.focus()
      return
    }
    focusListRow(rows[idx - 1])
  }

  return (
    <div
      ref={rootRef}
      data-list-table=""
      className={`min-w-0 overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_10px_30px_rgba(20,40,40,0.05)] [&_table:has([data-row-actions])_thead_th:last-child]:w-px [&_table:has([data-row-actions])_thead_th:last-child]:min-w-max [&_table:has([data-row-actions])_thead_th:last-child]:whitespace-nowrap [&_tbody_td:has([data-row-actions])]:w-px [&_tbody_td:has([data-row-actions])]:min-w-max [&_tbody_td:has([data-row-actions])]:whitespace-nowrap [&_tbody_tr[tabindex]]:outline-none [&_tbody_tr[tabindex]:focus]:bg-cream-50 [&_tbody_tr[tabindex]:focus-visible]:shadow-[inset_0_0_0_2px_#5ed4ce] ${
        rowClick
          ? '[&_tbody_tr:has([data-row-view])]:cursor-pointer [&_tbody_tr:has([data-row-view])]:hover:bg-cream-50'
          : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {hasRows ? (
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [&_table]:min-w-max">
          {children}
        </div>
      ) : loading ? (
        <LoadingState variant="inline" />
      ) : (
        <p className="px-4 py-10 text-center text-ink-500">{empty}</p>
      )}
    </div>
  )
}
