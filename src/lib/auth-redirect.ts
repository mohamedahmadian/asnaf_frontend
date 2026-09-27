/** Internal app path only — rejects protocol-relative and absolute URLs. */
export function safeAppPath(value: string | null | undefined): string | null {
  if (!value) return null
  let decoded = value.trim()
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // keep raw
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('://')) {
    return null
  }
  return decoded
}

export function withNext(path: string, next: string | null | undefined) {
  const safe = safeAppPath(next)
  if (!safe) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}next=${encodeURIComponent(safe)}`
}

export function afterAuthPath(next: string | null | undefined, fallback = '/dashboard') {
  return safeAppPath(next) ?? fallback
}
