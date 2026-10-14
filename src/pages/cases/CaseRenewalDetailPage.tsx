import { Navigate, useParams } from 'react-router-dom'

/** آدرس قدیمی جزئیات تمدید همان ویزارد درخواست را باز می‌کند. */
export function CaseRenewalDetailPage() {
  const { id = '', requestId = '' } = useParams()
  return <Navigate to={`/cases/${id}/process?requestId=${encodeURIComponent(requestId)}`} replace />
}
