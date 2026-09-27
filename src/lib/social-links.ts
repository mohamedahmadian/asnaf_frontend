export type SocialNetwork = 'website' | 'eitaa' | 'bale' | 'telegram' | 'instagram'

const networkHosts: Record<Exclude<SocialNetwork, 'website'>, string> = {
  eitaa: 'https://eitaa.com/',
  bale: 'https://ble.ir/',
  telegram: 'https://t.me/',
  instagram: 'https://instagram.com/',
}

/** شناسه ایتا بدون @ تکراری؛ از هندل خام یا لینک eitaa.com استخراج می‌شود. */
export function eitaaHandle(value: string) {
  const trimmed = value
    .trim()
    .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, '')
  if (!trimmed) return ''

  let raw = trimmed
  try {
    raw = decodeURIComponent(trimmed)
  } catch {
    raw = trimmed
  }

  const hash = /#@?([^/?#\s]+)/.exec(raw)
  if (/eitaa\.(?:com|ir)/i.test(raw) && hash?.[1]) {
    return hash[1].replace(/^@+/, '')
  }

  const path = /eitaa\.(?:com|ir)\/(?:joinchat\/)?(?:#@?)?([^/?#\s]+)/i.exec(raw)
  if (path?.[1] && path[1].toLowerCase() !== 'joinchat') {
    return path[1].replace(/^@+/, '')
  }

  return (
    raw
      .replace(/^[#@]+/, '')
      .replace(/\/+$/, '')
      .split(/[/?#\s]/)
      .map((part) => part.replace(/^@+/, '').trim())
      .find(Boolean) ?? ''
  )
}

/** آدرس چت وب ایتا: https://web.eitaa.com/#@username */
export function toEitaaWebChatUrl(value: string) {
  const handle = eitaaHandle(value)
  return handle ? `https://web.eitaa.com/#@${handle}` : ''
}

export function toExternalHref(value: string, network: SocialNetwork): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (network === 'website') {
    return `https://${trimmed.replace(/^\/+/, '')}`
  }
  const handle = trimmed.replace(/^@/, '').replace(/^\/+/, '')
  if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(handle)) {
    return `https://${handle}`
  }
  return `${networkHosts[network]}${handle}`
}

export function displayExternalUrl(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
}
