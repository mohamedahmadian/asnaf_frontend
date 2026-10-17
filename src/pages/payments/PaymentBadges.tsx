import { CircleCheck, CircleX, Clock3, CreditCard, Globe, ReceiptText, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PaymentMethod, PaymentStatus } from '../../types/app'

const methodIcons = {
  ONLINE: Globe,
  POS: CreditCard,
  BANK_RECEIPT: ReceiptText,
} as const

const statusStyles: Record<PaymentStatus, { icon: typeof CircleCheck; className: string }> = {
  PAID: { icon: CircleCheck, className: 'bg-teal-50 text-teal-700 ring-teal-200' },
  PENDING: { icon: Clock3, className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  FAILED: { icon: CircleX, className: 'bg-red-50 text-red-700 ring-red-200' },
}

const pillClassName =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1'

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const { t } = useTranslation()
  const Icon = methodIcons[method]
  return (
    <span className={`${pillClassName} bg-cream-50 text-ink-700 ring-line`}>
      <Icon className="size-3.5 text-teal-600" aria-hidden />
      {t(`payments.methods.${method}`)}
    </span>
  )
}

export function PaymentStatusBadge({
  status,
  deleted = false,
}: {
  status: PaymentStatus
  deleted?: boolean
}) {
  const { t } = useTranslation()
  if (deleted) {
    return (
      <span className={`${pillClassName} bg-cream-100 text-ink-500 ring-line`}>
        <Trash2 className="size-3.5" aria-hidden />
        {t('payments.deleted')}
      </span>
    )
  }
  const { icon: Icon, className } = statusStyles[status]
  return (
    <span className={`${pillClassName} ${className}`}>
      <Icon className="size-3.5" aria-hidden />
      {t(`payments.statuses.${status}`)}
    </span>
  )
}

export { methodIcons as paymentMethodIcons }
