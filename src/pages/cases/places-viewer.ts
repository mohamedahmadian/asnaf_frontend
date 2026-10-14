import { useAuth } from '../../auth/AuthProvider'
import { isPlacesViewer } from '../../lib/roles'

export function usePlacesViewer() {
  const { user } = useAuth()
  return isPlacesViewer(user)
}
