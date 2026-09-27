import { toast } from 'sonner'
import { api, getApiErrorMessage } from './api'

export async function openUserPanel(userId: string, errorFallback: string, popupBlocked: string) {
  const popup = window.open('/impersonate', '_blank')
  if (!popup) {
    toast.error(popupBlocked)
    return
  }

  try {
    const { data } = await api.post<{ token: string }>('/auth/impersonate', { userId })
    popup.location.replace(`/impersonate#${encodeURIComponent(data.token)}`)
  } catch (error) {
    popup.close()
    toast.error(getApiErrorMessage(error, errorFallback))
  }
}
