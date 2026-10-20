export type CaseExpiryRow = {
  id: string
  kind: 'LICENSE' | 'STEWARDSHIP'
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED'
  licenseNumber: string | null
  fullName: string
  nationalId: string | null
  job: { id: string; title: string } | null
  jobTitle: string | null
  issuedAt: string | null
  expiresAt: string | null
}

export const caseExpiryStatusClass: Record<CaseExpiryRow['status'], string> = {
  ACTIVE: 'bg-mint-50 text-teal-900 ring-mint-200',
  SUSPENDED: 'bg-amber-50 text-amber-900 ring-amber-200',
  EXPIRED: 'bg-red-50 text-red-700 ring-red-200',
  REVOKED: 'bg-rose-50 text-rose-800 ring-rose-200',
}

export function caseExpiryListPath(nationalId?: string | null) {
  return nationalId
    ? `/management/case-expiry?q=${encodeURIComponent(nationalId)}`
    : '/management/case-expiry'
}

export function caseExpiryEditPath(id: string) {
  return `/management/case-expiry/${id}/edit`
}
