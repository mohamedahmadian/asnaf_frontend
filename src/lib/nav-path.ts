export function normalizeMenuPath(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

export function menuPathMatches(pathname: string, menuPath: string) {
  const path = normalizeMenuPath(pathname)
  const itemPath = normalizeMenuPath(menuPath)
  if (itemPath === '/') return path === '/'
  return path === itemPath || path.startsWith(`${itemPath}/`)
}

/** Create form stays on `/board/requests`; existing request pages belong to `/board/plans`. */
export function sidebarMenuPathname(pathname: string) {
  const path = normalizeMenuPath(pathname)
  if (path === '/board/minutes' || path.startsWith('/board/minutes/') || /\/board\/requests\/[^/]+\/minutes/.test(path)) {
    return '/board/minutes'
  }
  if (path === '/board/requests' || path === '/board/requests/new') return path
  if (path.startsWith('/board/requests/')) return '/board/plans'
  return path
}

/** Longest matching menu path wins, so `/evaluations` stays inactive on `/evaluations/campaigns`. */
export function isSidebarMenuActive(pathname: string, menuPath: string, allMenuPaths: string[]) {
  const path = sidebarMenuPathname(pathname)
  if (!menuPathMatches(path, menuPath)) return false
  const normalized = normalizeMenuPath(menuPath)
  return !allMenuPaths.some((other) => {
    const otherPath = normalizeMenuPath(other)
    return otherPath !== normalized && otherPath.length > normalized.length && menuPathMatches(path, other)
  })
}
