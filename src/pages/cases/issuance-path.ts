type IssuanceTarget = {
  requestType: string
  nationalId: string | null
  caseFileId: string
  requestId: string
}

export function issuancePath(row: IssuanceTarget) {
  if (row.requestType === 'ISSUANCE') {
    const nationalId = row.nationalId ?? ''
    return `/cases/formation?nationalId=${encodeURIComponent(nationalId)}&caseId=${encodeURIComponent(row.caseFileId)}&focus=issuance`
  }
  if (row.requestType === 'RENEWAL' || row.requestType === 'LOCATION_CHANGE') {
    return `/cases/${row.caseFileId}/process?requestId=${encodeURIComponent(row.requestId)}&focus=issuance`
  }
  if (row.requestType === 'STEWARDSHIP') {
    return `/cases/${row.caseFileId}/stewardship?focus=issuance`
  }
  return `/cases/${row.caseFileId}/auction/${row.requestId}?step=issue`
}
