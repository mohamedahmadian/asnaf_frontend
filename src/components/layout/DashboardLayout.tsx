import { CircleChevronDown, CircleChevronUp, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { getNavIcon } from '../../lib/icons'
import { APP_NAV } from '../../lib/nav'
import { isSidebarMenuActive } from '../../lib/nav-path'
import { filterNavByAccess } from '../../lib/roles'
import type { NavMenu, NavModule } from '../../types/app'
import { AppLogo } from '../brand/AppLogo'
import { FormCardHeaderDecor } from '../ui/FormLayout'
import { PageTransition } from '../ui/PageTransition'
import { AdminFooter } from './AdminFooter'
import { HeaderToday } from './HeaderToday'
import { ImpersonationBanner } from './ImpersonationBanner'
import { PageBreadcrumb } from './PageBreadcrumb'
import { QuickToolsProvider } from './QuickTools'
import { UserMenu } from './UserMenu'

type SidebarNavMenu = NavMenu & { label?: string }

function flattenVisibleMenus(mods: NavModule[]): SidebarNavMenu[] {
  return mods.flatMap((mod) => mod.menus)
}

function sidebarMenuItemId(code: string) {
  return `sidebar-menu-${code}`
}

function sidebarModuleId(code: string) {
  return `sidebar-module-${code}`
}

const SIDEBAR_NAV_SCROLL_KEY = 'template.sidebar-nav-scroll'

function readSidebarNavScroll() {
  try {
    const value = Number(sessionStorage.getItem(SIDEBAR_NAV_SCROLL_KEY))
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

function writeSidebarNavScroll(value: number) {
  sidebarNavScrollTop = Math.max(0, value)
  try {
    sessionStorage.setItem(SIDEBAR_NAV_SCROLL_KEY, String(Math.round(sidebarNavScrollTop)))
  } catch {
    /* private mode / quota */
  }
}

let sidebarNavScrollTop = readSidebarNavScroll()

const SIDEBAR_COLLAPSED_MODULES_KEY = 'template.sidebar-collapsed-modules'
const SIDEBAR_DESKTOP_OPEN_KEY = 'template.sidebar-desktop-open'

function readCollapsedModules() {
  try {
    const raw = localStorage.getItem(SIDEBAR_COLLAPSED_MODULES_KEY)
    if (!raw) return [] as string[]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

function writeCollapsedModules(codes: string[]) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_MODULES_KEY, JSON.stringify(codes))
  } catch {
    /* private mode / quota */
  }
}

function readDesktopSidebarOpen() {
  try {
    return localStorage.getItem(SIDEBAR_DESKTOP_OPEN_KEY) !== '0'
  } catch {
    return true
  }
}

function writeDesktopSidebarOpen(open: boolean) {
  try {
    localStorage.setItem(SIDEBAR_DESKTOP_OPEN_KEY, open ? '1' : '0')
  } catch {
    /* private mode / quota */
  }
}

function useIsLargeScreen() {
  const query = '(min-width: 1024px)'
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : true,
  )
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return matches
}

function isElementFullyVisible(container: HTMLElement, item: HTMLElement) {
  const containerRect = container.getBoundingClientRect()
  const itemRect = item.getBoundingClientRect()
  return itemRect.top >= containerRect.top && itemRect.bottom <= containerRect.bottom
}

function scrollItemIntoNav(nav: HTMLElement, item: HTMLElement) {
  const navRect = nav.getBoundingClientRect()
  const itemRect = item.getBoundingClientRect()
  if (itemRect.top < navRect.top) {
    nav.scrollTop -= navRect.top - itemRect.top
  } else if (itemRect.bottom > navRect.bottom) {
    nav.scrollTop += itemRect.bottom - navRect.bottom
  }
}

function nextMenuIndex(current: number, delta: number, count: number) {
  if (count <= 0) return 0
  const index = Math.min(Math.max(current, 0), count - 1)
  return (index + delta + count) % count
}

function menuMatchesSearch(
  mod: NavModule,
  item: SidebarNavMenu,
  needle: string,
  label: (key: string) => string,
) {
  if (item.label?.includes(needle)) return true
  return label(item.nameKey).includes(needle) || label(mod.nameKey).includes(needle)
}

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isLargeScreen = useIsLargeScreen()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(readDesktopSidebarOpen)
  const [collapsedModules, setCollapsedModules] = useState(readCollapsedModules)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const mainRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const menuSearchRef = useRef<HTMLInputElement>(null)
  const menuSearchHintId = 'sidebar-menu-search-hint'
  const menuSearchListId = 'sidebar-menu-list'

  const setDesktopSidebarOpen = useCallback((next: boolean) => {
    setDesktopOpen(next)
    writeDesktopSidebarOpen(next)
  }, [])

  const toggleModule = useCallback((code: string) => {
    setCollapsedModules((current) => {
      const next = current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code]
      writeCollapsedModules(next)
      return next
    })
  }, [])

  const focusMenuSearch = useCallback(() => {
    setMobileOpen(true)
    setDesktopSidebarOpen(true)
    window.setTimeout(() => {
      const input = menuSearchRef.current
      if (!input) return
      input.focus()
      input.select()
    }, 0)
  }, [setDesktopSidebarOpen])

  useEffect(() => {
    const DOUBLE_CTRL_MS = 500
    let lastAt = 0
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.isComposing) return
      if (event.key !== 'Control') {
        lastAt = 0
        return
      }
      const now = Date.now()
      if (now - lastAt >= DOUBLE_CTRL_MS) {
        lastAt = now
        return
      }
      event.preventDefault()
      lastAt = 0
      focusMenuSearch()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [focusMenuSearch])

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  const rememberSidebarScroll = useCallback(() => {
    if (navRef.current) writeSidebarNavScroll(navRef.current.scrollTop)
  }, [])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    nav.scrollTop = sidebarNavScrollTop
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]')
    if (active && !isElementFullyVisible(nav, active)) {
      scrollItemIntoNav(nav, active)
    }
    writeSidebarNavScroll(nav.scrollTop)
  }, [])

  const navModules = useMemo(() => filterNavByAccess(APP_NAV, user), [user])

  const modules = useMemo(() => {
    const needle = query.trim()
    if (!needle) return navModules
    return navModules
      .map((mod) => ({
        ...mod,
        menus: mod.menus.filter((item) => menuMatchesSearch(mod, item, needle, t)),
      }))
      .filter((mod) => mod.menus.length > 0)
  }, [navModules, query, t])

  const visibleMenus = useMemo(() => flattenVisibleMenus(modules), [modules])
  const searching = Boolean(query.trim())
  const highlightedMenu = searching
    ? visibleMenus[
        visibleMenus.length ? Math.min(highlightedIndex, visibleMenus.length - 1) : 0
      ]
    : undefined

  const allMenuPaths = useMemo(
    () => navModules.flatMap((mod) => mod.menus.map((item) => item.path)),
    [navModules],
  )

  const sidebarInteractive = isLargeScreen ? desktopOpen : mobileOpen

  const openMenu = useCallback(
    (item: SidebarNavMenu) => {
      rememberSidebarScroll()
      setMobileOpen(false)
      navigate(item.path)
    },
    [navigate, rememberSidebarScroll],
  )

  const highlightMenu = useCallback(
    (code: string) => {
      const index = visibleMenus.findIndex((menu) => menu.code === code)
      if (index >= 0) setHighlightedIndex(index)
    },
    [visibleMenus],
  )

  const onMenuSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!searching || event.nativeEvent.isComposing) return
      const count = visibleMenus.length
      if (!count) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightedIndex((current) => nextMenuIndex(current, 1, count))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightedIndex((current) => nextMenuIndex(current, -1, count))
        return
      }
      if (event.key === 'Enter') {
        if (event.repeat) return
        event.preventDefault()
        const index = Math.min(highlightedIndex, count - 1)
        const item = visibleMenus[index] ?? visibleMenus[0]
        if (item) openMenu(item)
      }
    },
    [highlightedIndex, openMenu, searching, visibleMenus],
  )

  useEffect(() => {
    if (!highlightedMenu) return
    const el = document.getElementById(sidebarMenuItemId(highlightedMenu.code))
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightedMenu])

  return (
    <QuickToolsProvider>
      <div className="h-svh w-full overflow-hidden bg-cream-50">
        <div className="flex h-full w-full">
          {mobileOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-30 cursor-pointer bg-ink-900/20 lg:hidden"
              aria-label={t('nav.closeMenu')}
              onClick={() => setMobileOpen(false)}
            />
          ) : null}
          <aside
            inert={sidebarInteractive ? undefined : true}
            aria-hidden={sidebarInteractive ? undefined : true}
            className={`print:hidden fixed inset-y-0 start-0 z-40 flex h-svh w-[308px] shrink-0 flex-col overflow-hidden border-e border-teal-100 bg-gradient-to-b from-white via-teal-50/70 to-cream-50 shadow-[8px_0_28px_rgba(46,189,182,0.08)] transition-[width,transform,border-color,box-shadow] duration-300 ease-out lg:h-full lg:ltr:translate-x-0 lg:rtl:translate-x-0 ${
              mobileOpen
                ? 'translate-x-0'
                : 'ltr:-translate-x-full rtl:translate-x-full'
            } ${
              desktopOpen
                ? 'lg:relative lg:w-[308px] lg:min-w-[308px]'
                : 'lg:relative lg:w-0 lg:min-w-0 lg:border-transparent lg:shadow-none'
            }`}
          >
            <div
              className={`relative flex h-full w-[308px] min-w-[308px] flex-col transition-opacity duration-300 ease-out ${
                desktopOpen ? 'opacity-100' : 'lg:opacity-0'
              }`}
            >
            <div
              className="pointer-events-none absolute -start-16 top-24 size-44 rounded-full bg-teal-200/25 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -end-20 bottom-32 size-48 rounded-full bg-mint-100/70 blur-2xl"
              aria-hidden
            />

            <div className="relative overflow-hidden border-b border-teal-100/80 bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-5">
              <FormCardHeaderDecor />
              <div className="relative flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <NavLink to="/dashboard" onClick={() => setMobileOpen(false)} className="shrink-0">
                    <AppLogo decorative className="h-10 w-auto max-w-10 shrink-0 object-contain" />
                  </NavLink>
                  <NavLink
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="min-w-0 font-semibold leading-snug text-ink-900"
                  >
                    {t('nav.panel')}
                  </NavLink>
                </div>
                <button
                  type="button"
                  className="shrink-0 cursor-pointer rounded-lg p-2 text-ink-500 lg:hidden"
                  onClick={() => setMobileOpen(false)}
                  aria-label={t('nav.closeMenu')}
                >
                  <X className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="hidden shrink-0 cursor-pointer rounded-lg p-2 text-teal-700 transition hover:bg-teal-50 lg:inline-flex"
                  onClick={() => setDesktopSidebarOpen(false)}
                  aria-expanded={true}
                  aria-label={t('nav.closeMenu')}
                >
                  <PanelLeftClose className="size-5 rtl:-scale-x-100" aria-hidden />
                </button>
              </div>
            </div>

            <div className="relative px-4 pb-3 pt-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-teal-500" />
                <input
                  ref={menuSearchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setHighlightedIndex(0)
                  }}
                  onKeyDown={onMenuSearchKeyDown}
                  placeholder={t('nav.searchMenu')}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={searching}
                  aria-controls={menuSearchListId}
                  aria-activedescendant={
                    highlightedMenu ? sidebarMenuItemId(highlightedMenu.code) : undefined
                  }
                  aria-describedby={menuSearchHintId}
                  className="w-full rounded-2xl border border-teal-100 bg-white/90 py-2.5 ps-10 pe-3 text-sm shadow-[0_6px_16px_rgba(46,189,182,0.08)] placeholder:text-ink-400"
                />
              </label>
              <p id={menuSearchHintId} className="mt-2 px-1 text-[9px] leading-tight text-ink-400">
                {t('nav.searchMenuHint')}
              </p>
            </div>

            <nav
              ref={navRef}
              id={menuSearchListId}
              className="sidebar-nav relative flex-1 space-y-3 overflow-y-auto [overflow-anchor:none] px-2.5 pb-3"
              onScroll={(event) => writeSidebarNavScroll(event.currentTarget.scrollTop)}
            >
              {modules.map((mod, index) => {
                const moduleActive = mod.menus.some((item) =>
                  isSidebarMenuActive(location.pathname, item.path, allMenuPaths),
                )
                const mintTone = index % 2 === 1
                const moduleExpanded = searching || !collapsedModules.includes(mod.code)
                const moduleName = t(mod.nameKey)
                const chevronClass = `size-4 shrink-0 ${mintTone ? 'text-mint-600' : 'text-teal-600'}`
                return (
                  <section
                    key={mod.code}
                    className={`overflow-hidden rounded-2xl border shadow-[0_8px_20px_rgba(46,189,182,0.08)] ${
                      moduleActive
                        ? 'border-teal-200 bg-gradient-to-b from-teal-50 to-white shadow-[0_12px_26px_rgba(46,189,182,0.16)]'
                        : mintTone
                          ? 'border-mint-100/90 bg-gradient-to-b from-mint-50/70 to-white'
                          : 'border-teal-100/90 bg-gradient-to-b from-white to-teal-50/40'
                    }`}
                  >
                    <header
                      className={
                        mintTone
                          ? 'border-mint-100/80 bg-gradient-to-e from-mint-50 via-white to-teal-50/50'
                          : 'border-teal-100/80 bg-gradient-to-e from-teal-50 via-white to-mint-50/50'
                      }
                    >
                      <button
                        type="button"
                        className="flex w-full cursor-pointer appearance-none items-center gap-2.5 bg-transparent px-3 py-2.5 text-start transition hover:bg-white/70 focus-visible:outline-none! focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300"
                        aria-expanded={moduleExpanded}
                        aria-controls={sidebarModuleId(mod.code)}
                        aria-label={t(moduleExpanded ? 'nav.collapseModule' : 'nav.expandModule', {
                          name: moduleName,
                        })}
                        onClick={() => {
                          if (searching) return
                          toggleModule(mod.code)
                        }}
                      >
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-xl text-white ${
                            mintTone
                              ? 'bg-mint-500 shadow-[0_6px_14px_rgba(63,214,190,0.32)]'
                              : 'bg-teal-500 shadow-[0_6px_14px_rgba(46,189,182,0.32)]'
                          }`}
                        >
                          {createElement(getNavIcon(mod.icon), {
                            className: 'size-3.5',
                            'aria-hidden': true,
                          })}
                        </span>
                        <span
                          className={`min-w-0 flex-1 text-[11px] font-semibold leading-snug ${
                            mintTone ? 'text-mint-800' : 'text-teal-800'
                          }`}
                        >
                          {moduleName}
                        </span>
                        {moduleExpanded ? (
                          <CircleChevronUp className={chevronClass} aria-hidden />
                        ) : (
                          <CircleChevronDown className={chevronClass} aria-hidden />
                        )}
                      </button>
                    </header>
                    <div
                      id={sidebarModuleId(mod.code)}
                      inert={moduleExpanded ? undefined : true}
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        moduleExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-1 p-1.5">
                          {mod.menus.map((item) => (
                            <SidebarMenuLink
                              key={item.code}
                              item={item}
                              allMenuPaths={allMenuPaths}
                              highlighted={highlightedMenu?.code === item.code}
                              onHighlight={() => highlightMenu(item.code)}
                              onNavigate={() => {
                                rememberSidebarScroll()
                                setMobileOpen(false)
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                )
              })}
            </nav>
            <div className="relative shrink-0 border-t border-teal-100/80 bg-gradient-to-e from-white via-teal-50/40 to-white px-3 py-3">
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                onClick={() => {
                  const impersonating = Boolean(user?.impersonating)
                  setMobileOpen(false)
                  logout()
                  if (!impersonating) navigate('/login')
                }}
              >
                <LogOut className="size-4 shrink-0" aria-hidden />
                {user?.impersonating ? t('auth.impersonateEnd') : t('auth.logout')}
              </button>
            </div>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
            <ImpersonationBanner />
            <header className="print:hidden z-20 flex shrink-0 items-center gap-3 bg-cream-50/90 px-4 py-4 backdrop-blur sm:px-8">
              <button
                type="button"
                className="cursor-pointer rounded-xl p-2 text-ink-700 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label={t('nav.openMenu')}
              >
                <Menu className="size-5" aria-hidden />
              </button>
              {desktopOpen ? null : (
                <button
                  type="button"
                  className="hidden cursor-pointer rounded-xl p-2 text-teal-700 transition hover:bg-teal-50 lg:inline-flex"
                  onClick={() => setDesktopSidebarOpen(true)}
                  aria-expanded={false}
                  aria-label={t('nav.openMenu')}
                >
                  <PanelLeftOpen className="size-5 rtl:-scale-x-100" aria-hidden />
                </button>
              )}
              <PageBreadcrumb pathname={location.pathname} modules={APP_NAV} />
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <HeaderToday />
                <UserMenu />
              </div>
            </header>
            <main
              ref={mainRef}
              className="min-h-0 min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto px-4 pb-8 sm:px-8"
            >
              <PageTransition>{children ?? <Outlet />}</PageTransition>
            </main>
            <AdminFooter />
          </div>
        </div>
      </div>
    </QuickToolsProvider>
  )
}

function SidebarMenuLink({
  item,
  allMenuPaths,
  onNavigate,
  highlighted = false,
  onHighlight,
}: {
  item: SidebarNavMenu
  allMenuPaths: string[]
  onNavigate: () => void
  highlighted?: boolean
  onHighlight?: () => void
}) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isActive = isSidebarMenuActive(pathname, item.path, allMenuPaths)
  return (
    <Link
      id={sidebarMenuItemId(item.code)}
      to={item.path}
      onClick={onNavigate}
      onMouseEnter={onHighlight}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition ${
        isActive
          ? `bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white shadow-[0_8px_16px_rgba(46,189,182,0.32)]${highlighted ? ' ring-2 ring-inset ring-white/70' : ''}`
          : highlighted
            ? 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200'
            : 'text-ink-700 hover:bg-teal-50 hover:text-teal-800'
      }`}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-xl transition ${
          isActive
            ? 'bg-white/20 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]'
            : highlighted
              ? 'bg-teal-100 text-teal-700'
              : 'bg-teal-50 text-teal-600 group-hover:bg-white group-hover:text-teal-700 group-hover:shadow-[0_4px_10px_rgba(46,189,182,0.16)]'
        }`}
      >
        {createElement(getNavIcon(item.icon), {
          className: 'size-3.5',
          'aria-hidden': true,
        })}
      </span>
      <span className="min-w-0 flex-1 truncate">{t(item.nameKey)}</span>
    </Link>
  )
}
