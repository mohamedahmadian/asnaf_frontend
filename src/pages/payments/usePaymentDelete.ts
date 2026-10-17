import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { confirmToast } from '../../components/ui/confirmToast'
import { api, getApiErrorMessage } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import type { PaymentRecord } from '../../types/app'

export function canDeletePayment(payment: Pick<PaymentRecord, 'method' | 'status' | 'deletedAt'>) {
  return !payment.deletedAt && !(payment.method === 'ONLINE' && payment.status === 'PAID')
}

export function usePaymentDelete() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()

  return function deletePayment(payment: Pick<PaymentRecord, 'id' | 'receiptNumber'>, onDeleted?: () => void) {
    confirmToast({
      title: t('payments.deleteConfirm', { value: localizeDigits(payment.receiptNumber, locale) }),
      confirmLabel: t('common.yesDelete'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      prompt: {
        label: t('payments.deleteReason'),
        placeholder: t('payments.deleteReasonPlaceholder'),
        required: true,
        minLength: 3,
        requiredMessage: t('payments.deleteReasonRequired'),
      },
      onConfirm: async (reason) => {
        try {
          await api.delete(`/payment-history/${payment.id}`, { data: { reason: reason?.trim() ?? '' } })
          toast.success(t('payments.deletedToast'))
          await queryClient.invalidateQueries({ queryKey: ['payment-history'] })
          onDeleted?.()
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
        }
      },
    })
  }
}
