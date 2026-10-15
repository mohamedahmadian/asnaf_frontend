/** بازگشت امن به تب سرفصل‌های مالی همان حساب بانکی. */
export function accountHeadingsReturnTo(value: string | null) {
  if (!value || !value.startsWith('/base-info/bank-accounts/')) return null
  if (value.startsWith('//') || value.includes('://') || value.includes('\\')) return null
  return value
}
