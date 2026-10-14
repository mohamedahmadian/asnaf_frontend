type ReviewTarget = {
  requestType: string
  nationalId: string | null
  caseFileId: string
  requestId: string
}

export function managementReviewPath(row: ReviewTarget) {
  if (row.requestType === 'ISSUANCE') {
    const nationalId = row.nationalId ?? ''
    return `/cases/formation?nationalId=${encodeURIComponent(nationalId)}&caseId=${encodeURIComponent(row.caseFileId)}&focus=management`
  }
  if (row.requestType === 'RENEWAL' || row.requestType === 'LOCATION_CHANGE') {
    return `/cases/${row.caseFileId}/process?requestId=${encodeURIComponent(row.requestId)}&focus=management`
  }
  if (row.requestType === 'STEWARDSHIP') {
    return `/cases/${row.caseFileId}/stewardship?focus=management`
  }
  return `/cases/${row.caseFileId}/auction/${row.requestId}?step=management`
}
