import { nextSortState, type SortDir } from '../components/ui/ListControls'

type SetParams = (
  updates: Record<string, string | undefined>,
  options?: { resetPage?: boolean },
) => void

export function useListSort(
  searchParams: URLSearchParams,
  setParams: SetParams,
  keys?: { sortBy?: string; sortDir?: string },
) {
  const sortByKey = keys?.sortBy ?? 'sortBy'
  const sortDirKey = keys?.sortDir ?? 'sortDir'
  const sortBy = searchParams.get(sortByKey) ?? ''
  const sortDir = (searchParams.get(sortDirKey) ?? '') as SortDir | ''
  const sortParams =
    sortBy && (sortDir === 'asc' || sortDir === 'desc')
      ? { sortBy, sortDir }
      : {}

  function onSort(column: string) {
    const next = nextSortState(column, sortBy, sortDir)
    setParams(
      { [sortByKey]: next.sortBy, [sortDirKey]: next.sortDir },
      { resetPage: true },
    )
  }

  return { sortBy, sortDir, sortParams, onSort }
}
