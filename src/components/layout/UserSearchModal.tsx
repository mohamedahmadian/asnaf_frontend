import { Search, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { useGeoName } from '../../lib/geo'
import type { ManagedUser, Paginated } from '../../types/app'
import { AppForm, fieldClassName } from '../ui/Form'

export function UserSearchModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const geoName = useGeoName()
  const [term, setTerm] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const query = useQuery({
    queryKey: ['users', 'quick-search', term],
    enabled: open && term.trim().length >= 1,
    queryFn: async () => {
      const { data } = await api.get<Paginated<ManagedUser>>('/users', {
        params: { q: term.trim(), page: 1, pageSize: 12, sortBy: 'fullName', sortDir: 'asc' },
      })
      return data
    },
  })

  const items = query.data?.items ?? []

  useEffect(() => {
    if (!open) return
    setTerm('')
    setHighlighted(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    setHighlighted(0)
  }, [term])

  const selected = items[Math.min(highlighted, Math.max(items.length - 1, 0))]

  const hint = useMemo(() => t('quickTools.searchInfoHint'), [t])

  if (!open) return null

  function openUser(id: string) {
    onClose()
    navigate(`/users/${id}`)
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-ink-900/30 p-4 pt-[12vh]" data-nested-dialog>
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-white shadow-xl">
        <header className="relative overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="pointer-events-none absolute -start-8 -top-10 size-32 rounded-full bg-teal-200/30" aria-hidden />
          <div className="pointer-events-none absolute -end-6 -bottom-12 size-28 rounded-full bg-mint-100/70" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <Search className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink-900">{t('quickTools.searchInfoTitle')}</h2>
                <p className="text-[11px] text-ink-500">{hint}</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-xl p-2 text-ink-500 hover:bg-white"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" />
            </button>
          </div>
        </header>
        <AppForm
          className="space-y-3 p-4"
          onSubmit={() => {
            if (selected) openUser(selected.id)
          }}
        >
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (!items.length) return
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setHighlighted((current) => (current + 1) % items.length)
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setHighlighted((current) => (current - 1 + items.length) % items.length)
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
              }
            }}
            className={fieldClassName}
            placeholder={t('users.searchPlaceholder')}
            autoComplete="off"
          />
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start text-sm ${
                    index === highlighted
                      ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-200'
                      : 'hover:bg-cream-50'
                  }`}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => openUser(item.id)}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                    <UserRound className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.fullName}</span>
                    <span className="block truncate text-xs text-ink-400">
                      {[
                        item.username,
                        item.nationalId ? localizeDigits(item.nationalId, locale) : null,
                        item.phone ? localizeDigits(item.phone, locale) : null,
                        item.city ? geoName(item.city) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {term.trim() && !query.isLoading && items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-ink-400">{t('users.noResults')}</li>
            ) : null}
          </ul>
        </AppForm>
      </section>
    </div>,
    document.body,
  )
}
