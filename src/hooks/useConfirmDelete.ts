import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { confirmToast } from '../components/ui/confirmToast'
import { api, getApiErrorMessage } from '../lib/api'

export function useConfirmDelete() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  function confirmDelete({
    message,
    successMessage,
    path,
    queryKey,
    onDeleted,
  }: {
    message: string
    successMessage: string
    path: string
    queryKey: unknown[]
    onDeleted?: () => void
  }) {
    confirmToast({
      title: message,
      confirmLabel: t('common.yesDelete'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(path)
          toast.success(successMessage)
          onDeleted?.()
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
          return
        }
        void queryClient.invalidateQueries({ queryKey })
      },
    })
  }

  return { confirmDelete }
}
