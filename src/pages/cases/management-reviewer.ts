import { useAuth } from '../../auth/AuthProvider'
import { isManagementReviewer } from '../../lib/roles'

export function useManagementReviewer() {
  const { user } = useAuth()
  return isManagementReviewer(user)
}
