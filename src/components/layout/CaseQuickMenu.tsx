import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { getNavIcon } from '../../lib/icons'
import { isSidebarMenuActive } from '../../lib/nav-path'
import { hasMenuAccess } from '../../lib/roles'
import { AppLogo } from '../brand/AppLogo'

const CASE_SHORTCUTS = [
  {
    code: 'cases.management',
    moduleCode: 'cases',
    path: '/cases',
    icon: 'files',
    nameKey: 'menus.caseManagement',
  },
  {
    code: 'cases.formation',
    moduleCode: 'cases',
    path: '/cases/formation',
    icon: 'file-plus',
    nameKey: 'menus.caseFormation',
  },
  {
    code: 'finance.payments',
    moduleCode: 'finance',
    path: '/finance/payments',
    icon: 'banknote',
    nameKey: 'menus.payments',
  },
] as const

export function CaseQuickMenu() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const items = useMemo(
    () => CASE_SHORTCUTS.filter((item) => hasMenuAccess(user, item.code, item.moduleCode)),
    [user],
  )
  const paths = useMemo(() => items.map((item) => item.path), [items])

  useEffect(() => {
    setOpen(false)
  }, [pathname, search])

  useEffect(() => {
    if (!open) return
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div ref={ref} className="print:hidden fixed bottom-6 end-6 z-30">
      {open ? (
        <div
          role="menu"
          className="absolute bottom-full end-0 mb-3 w-56 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-[0_12px_32px_rgba(46,189,182,0.22)]"
        >
          {items.map((item) => {
            const active = isSidebarMenuActive(pathname, item.path, paths, search)
            return (
              <Link
                key={item.code}
                to={item.path}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm transition ${
                  active ? 'bg-teal-50 font-medium text-teal-800' : 'text-ink-800 hover:bg-cream-50'
                }`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  {createElement(getNavIcon(item.icon), { className: 'size-4', 'aria-hidden': true })}
                </span>
                {t(item.nameKey)}
              </Link>
            )
          })}
        </div>
      ) : null}
      <button
        type="button"
        className="flex size-14 cursor-pointer items-center justify-center rounded-full bg-white shadow-[0_10px_28px_rgba(46,189,182,0.35)] ring-2 ring-teal-400 transition hover:ring-mint-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('nav.caseShortcuts')}
      >
        <AppLogo decorative className="size-9 object-contain" />
      </button>
    </div>
  )
}
