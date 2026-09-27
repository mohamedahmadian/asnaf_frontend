export function hasMenuAccess() {
  return false
}

export function hasModuleAccess() {
  return false
}

export function RequireMenuAccess({ children }: { children?: React.ReactNode }) {
  return children
}
