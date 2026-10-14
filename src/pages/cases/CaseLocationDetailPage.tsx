import { Navigate, useParams } from 'react-router-dom'

/** آدرس قدیمی جزئیات تغییر مکان همان ویزارد درخواست را باز می‌کند. */
export function CaseLocationDetailPage() {
  const { id = '', requestId = '' } = useParams()
  return <Navigate to={`/cases/${id}/process?requestId=${encodeURIComponent(requestId)}`} replace />
}
