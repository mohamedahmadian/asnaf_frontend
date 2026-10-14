import type { NavModule } from '../types/app'

const NAMED_MENU_KEYS: Record<string, string> = {
  'cases.inquiries': 'menus.caseInquiriesNamed',
  'reports.inquiry-centers': 'menus.caseInquiriesReportsNamed',
}

/** نام مرکزهای استعلامی که کاربر مسئول آن‌هاست، برای عنوان منو. */
export function inquiryCenterMenuName(centers: { name: string }[] | null | undefined) {
  const names = (centers ?? []).map((center) => center.name.trim()).filter(Boolean)
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} و ${names[1]}`
  return `${names.slice(0, -1).join('، ')} و ${names[names.length - 1]}`
}

export function inquiryMenuTitle(
  code: string,
  centers: { name: string }[] | null | undefined,
  t: (key: string, options?: { name: string }) => string,
  fallbackKey: string,
) {
  const name = inquiryCenterMenuName(centers)
  const key = NAMED_MENU_KEYS[code]
  if (!name || !key) return t(fallbackKey)
  return t(key, { name })
}

export function withInquiryCenterMenuLabels(modules: NavModule[], centers: { name: string }[] | null | undefined, t: (key: string, options?: { name: string }) => string) {
  const name = inquiryCenterMenuName(centers)
  if (!name) return modules
  return modules.map((mod) => ({
    ...mod,
    menus: mod.menus.map((item) => {
      const key = NAMED_MENU_KEYS[item.code]
      if (!key) return item
      return { ...item, label: t(key, { name }) }
    }),
  }))
}
