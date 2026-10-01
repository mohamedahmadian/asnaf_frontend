import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useListParams(keys?: { q?: string; page?: string }) {
  const qKey = keys?.q ?? 'q'
  const pageKey = keys?.page ?? 'page'
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get(qKey) ?? ''
  const page = Math.max(1, Number(searchParams.get(pageKey) || '1') || 1)
  const [term, setTerm] = useState(q)

  useEffect(() => {
    setTerm(q)
  }, [q])

  function setParams(
    updates: Record<string, string | undefined>,
    options?: { resetPage?: boolean },
  ) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    }
    if (options?.resetPage) {
      next.set(pageKey, '1')
    }
    setSearchParams(next)
  }

  function applySearch(nextTerm = term) {
    const trimmed = nextTerm.trim()
    setParams({ [qKey]: trimmed || undefined }, { resetPage: true })
  }

  function setPage(nextPage: number) {
    setParams({ [pageKey]: String(Math.max(1, nextPage)) })
  }

  return { q, page, term, setTerm, applySearch, setPage, searchParams, setParams }
}
