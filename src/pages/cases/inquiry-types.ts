export type CaseInquiryStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type CaseInquiryChannel = 'MANUAL' | 'SYSTEM'

export type CaseInquiryFile = {
  id: string
  originalName: string | null
  mimeType: string
  byteSize: number
  createdAt: string
}

export type CaseInquiryRow = {
  id: string
  status: CaseInquiryStatus
  channel: CaseInquiryChannel | null
  note: string | null
  decidedAt: string | null
  decidedBy: { id: string; fullName: string } | null
  center: {
    id: string
    name: string
    phone: string | null
    officerName: string | null
  }
  files: CaseInquiryFile[]
}

export type CaseInquiryLetter = {
  id: string
  centerName: string
  centerPhone: string | null
  nationalId: string | null
  letterTitle: string
  letterBody: string
  fields: Record<string, string>
}
