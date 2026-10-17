import { localizeDigits } from '../../lib/datetime'
import type { GatewayRedirect, PaymentCaseFile } from '../../types/app'

/** بانک فقط POST فرم می‌پذیرد؛ مرورگر با همین فرم به درگاه می‌رود. */
export function submitToGateway(redirect: GatewayRedirect) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = redirect.url
  form.style.display = 'none'
  for (const [name, value] of Object.entries(redirect.fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}

export const ALL_PAYMENT_GROUPS = 'all'

export function paymentCaseLabel(file: PaymentCaseFile | null | undefined, locale: string) {
  if (!file) return ''
  const number =
    file.kind === 'STEWARDSHIP'
      ? file.cardNumber || file.licenseNumber
      : file.licenseNumber || file.cardNumber
  const code = number || file.trackingCode
  const localized = code ? localizeDigits(code, locale) : ''
  const title = file.businessUnitTitle?.trim() || file.activityJobTitle?.trim() || ''
  if (localized && title) return `${localized} — ${title}`
  return localized || title || '—'
}

export function asItemList<T>(data: T[] | { items: T[] }) {
  return Array.isArray(data) ? data : data.items
}

export function discountShare(subtotal: number, percent: number) {
  const hundredths = Math.round(percent * 100)
  return Math.round((subtotal * hundredths) / 10000)
}
