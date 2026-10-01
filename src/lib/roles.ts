import { APP_NAV } from './nav'
import { menuPathMatches } from './nav-path'
import type { AuthUser, NavModule } from '../types/app'

export const ADMIN_ROLE_CODE = 'ADMIN'
export const EMPLOYEE_ROLE_CODE = 'EMPLOYEE'

export function isSystemRoleLocked(role?: { isSystem?: boolean; code?: string } | null) {
  return Boolean(role?.isSystem || role?.code === ADMIN_ROLE_CODE)
}

export function isRolePermissionsLocked(role?: { code?: string } | null) {
  return role?.code === ADMIN_ROLE_CODE
}

export function isAdmin(user?: { isAdmin?: boolean; roles?: { code: string }[] } | null) {
  if (!user) return false
  if (user.isAdmin) return true
  return Boolean(user.roles?.some((role) => role.code === ADMIN_ROLE_CODE))
}

export function formatRoles(
  roles: { name?: string; nameKey?: string; code?: string }[] | undefined,
  t: (key: string) => string,
) {
  if (!roles?.length) return ''
  return roles
    .map((role) => role.name || (role.nameKey ? t(role.nameKey) : role.code) || '')
    .filter(Boolean)
    .join('، ')
}

export function hasNoRoles(user?: { roles?: unknown[] } | null) {
  return !user?.roles?.length
}

export function hasPermission(
  user: Pick<AuthUser, 'isAdmin' | 'permissionCodes' | 'roles'> | null | undefined,
  code: string,
) {
  if (!user) return false
  if (isAdmin(user)) return true
  const codes = user.permissionCodes ?? []
  if (codes.includes(code)) return true
  const parent = code.includes('.') ? code.slice(0, code.lastIndexOf('.')) : null
  return parent ? codes.includes(parent) : false
}

export function hasMenuAccess(
  user: Pick<AuthUser, 'isAdmin' | 'permissionCodes' | 'roles' | 'position'> | null | undefined,
  menuCode: string,
  moduleCode: string,
) {
  if (menuCode === 'dashboard.home') {
    return true
  }
  return hasPermission(user, menuCode) || hasPermission(user, moduleCode)
}

export function filterNavByAccess(
  nav: NavModule[],
  user: Pick<AuthUser, 'isAdmin' | 'permissionCodes' | 'roles' | 'position'> | null | undefined,
) {
  if (isAdmin(user)) return nav
  return nav
    .map((mod) => ({
      ...mod,
      menus: mod.menus.filter((menu) => hasMenuAccess(user, menu.code, mod.code)),
    }))
    .filter((mod) => mod.menus.length > 0)
}

const ALWAYS_ALLOWED_PREFIXES = ['/account', '/settings']

export function canAccessPath(
  user: Pick<AuthUser, 'isAdmin' | 'permissionCodes' | 'roles' | 'position'> | null | undefined,
  pathname: string,
) {
  if (!user) return false
  if (isAdmin(user)) return true
  if (pathname === '/' || pathname === '/dashboard') return true
  if (pathname === '/inspection/violations/new') {
    return (
      hasMenuAccess(user, 'inspection.violations.register', 'inspection') ||
      hasMenuAccess(user, 'inspection.violations', 'inspection')
    )
  }
  if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true
  }

  let best:
    | {
        menuCode: string
        moduleCode: string
        path: string
      }
    | undefined
  for (const mod of APP_NAV) {
    for (const menu of mod.menus) {
      if (!menuPathMatches(pathname, menu.path)) continue
      if (!best || menu.path.length > best.path.length) {
        best = { menuCode: menu.code, moduleCode: mod.code, path: menu.path }
      }
    }
  }
  if (!best) return true
  return hasMenuAccess(user, best.menuCode, best.moduleCode)
}
