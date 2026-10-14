import { useAuth } from '../../auth/AuthProvider'
import { hasPermission, isAdmin } from '../../lib/roles'
import { useManagementReviewer } from './management-reviewer'
import { usePlacesViewer } from './places-viewer'

/** عمل روی پرونده، جدا از منویی که صفحه را نشان می‌دهد. مدیر از هر دو رد می‌شود. */
export function useCaseCapabilities() {
  const { user } = useAuth()
  const admin = isAdmin(user)
  const placesViewer = usePlacesViewer()
  const managementReviewer = useManagementReviewer()
  const canForm = admin || hasPermission(user, 'cases.formation')
  const canIssue = admin || hasPermission(user, 'cases.issuance')
  const issuerViewer =
    Boolean(user) &&
    hasPermission(user, 'cases.issuance') &&
    !hasPermission(user, 'cases.formation') &&
    !hasPermission(user, 'cases.management') &&
    !admin
  const roleIds = (user?.roles ?? []).map((role) => role.id)
  return {
    user,
    admin,
    placesViewer,
    managementReviewer,
    issuerViewer,
    canForm,
    canIssue,
    formLocked: !canForm,
    roleIds,
    managementRoleIds: admin ? undefined : roleIds,
  }
}
