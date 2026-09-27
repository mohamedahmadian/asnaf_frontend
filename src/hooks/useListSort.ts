import { nextSortState, type SortDir } from '../components/ui/ListControls'

type SetParams = (
  updates: Record<string, string | undefined>,
  options?: { resetPage?: boolean },
) => void

export function useListSort(
  searchParams: URLSearchParams,
  setParams: SetParams,
) {
  const sortBy = searchParams.get('sortBy') ?? ''
  const sortDir = (searchParams.get('sortDir') ?? '') as SortDir | ''
  const sortParams =
    sortBy && (sortDir === 'asc' || sortDir === 'desc')
      ? { sortBy, sortDir }
      : {}

  function onSort(column: string) {
    const next = nextSortState(column, sortBy, sortDir)
    setParams(
      { sortBy: next.sortBy, sortDir: next.sortDir },
      { resetPage: true },
    )
  }

  return { sortBy, sortDir, sortParams, onSort }
}
