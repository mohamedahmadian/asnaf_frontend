/** پروندهٔ بازشده از فهرست مدیریت، روی همان فرم تشکیل پرونده. */
export const CASE_DETAILS_VIEW = 'details'

export function normalizeMenuPath(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

export function isCaseDetailsLocation(pathname: string, search = '') {
  if (normalizeMenuPath(pathname) !== '/cases/formation') return false
  const query = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(query).get('view') === CASE_DETAILS_VIEW
}

const CASE_MENU_SEGMENTS = new Set(['formation', 'inquiries', 'places', 'management-reviews', 'issuance', 'reports', 'settings'])

/** پرونده، درخواست و ویزارد؛ صفحهٔ ایجاد و ویرایش بیرون است. */
export function isPlacesCaseBrowse(pathname: string, search = '') {
  const path = normalizeMenuPath(pathname)
  if (path.endsWith('/edit') || path.endsWith('/new')) return false
  if (path === '/cases/formation') {
    const query = search.startsWith('?') ? search.slice(1) : search
    return Boolean(new URLSearchParams(query).get('caseId'))
  }
  if (path.startsWith('/cases/formation/')) return false
  const match = path.match(/^\/cases\/([^/]+)/)
  if (!match || CASE_MENU_SEGMENTS.has(match[1] ?? '')) return false
  return true
}

function menuTarget(menuPath: string) {
  const [rawPath, query = ''] = menuPath.split('?')
  return { path: normalizeMenuPath(rawPath || '/'), query }
}

export function menuPathMatches(pathname: string, menuPath: string, search = '') {
  const path = normalizeMenuPath(pathname)
  const item = menuTarget(menuPath)
  if (item.path === '/') {
    if (path !== '/') return false
  } else if (path !== item.path && !path.startsWith(`${item.path}/`)) {
    return false
  }
  if (!item.query) return true
  const wanted = new URLSearchParams(item.query)
  const actual = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  for (const [key, value] of wanted) {
    if (actual.get(key) !== value) return false
  }
  return true
}

/** Create form stays on `/board/requests`; existing request pages belong to `/board/plans`. */
export function sidebarMenuPathname(pathname: string, search = '') {
  const path = normalizeMenuPath(pathname)
  if (path === '/board/minutes' || path.startsWith('/board/minutes/') || /\/board\/requests\/[^/]+\/minutes/.test(path)) {
    return '/board/minutes'
  }
  if (path === '/board/requests' || path === '/board/requests/new') return path
  if (path.startsWith('/board/requests/')) return '/board/plans'
  if (isCaseDetailsLocation(path, search)) return '/cases'
  return path
}

/** Longest matching menu path wins, so `/evaluations` stays inactive on `/evaluations/campaigns`. */
export function isSidebarMenuActive(pathname: string, menuPath: string, allMenuPaths: string[], search = '') {
  const path = sidebarMenuPathname(pathname, search)
  if (!menuPathMatches(path, menuPath, search)) return false
  const normalized = normalizeMenuPath(menuPath)
  return !allMenuPaths.some((other) => {
    const otherPath = normalizeMenuPath(other)
    return otherPath !== normalized && otherPath.length > normalized.length && menuPathMatches(path, other, search)
  })
}
