/** بازگشت به تب عوارض همان حساب؛ فقط مسیر داخلی حساب بانکی مجاز است. */
export function accountFeesReturnTo(value: string | null) {
  if (!value || !value.startsWith('/base-info/bank-accounts/')) return null
  if (value.startsWith('//') || value.includes('://') || value.includes('\\')) return null
  return value
}
