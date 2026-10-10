export const AUCTION_APPROVER_KINDS = ['SPECIAL_INSPECTOR', 'AUCTION_COMMITTEE', 'COMMERCIAL_MANAGER'] as const

export type AuctionApproverKind = (typeof AUCTION_APPROVER_KINDS)[number]

export type AuctionApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type AuctionRequest = {
  id: string
  caseId: string
  number: string
  status: 'OPEN' | 'ISSUED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
  editable: boolean
  startsAt: string
  endsAt: string
  discountMin: number
  discountMax: number
  items: {
    id: string
    name: string
    price: number
    discountPercent: number
    priceAfterDiscount: number
  }[]
  approvals: {
    id: string
    kind: AuctionApproverKind
    status: AuctionApprovalStatus
    note: string | null
    decidedAt: string | null
    decidedBy: { id: string; fullName: string } | null
    people: { id: string; fullName: string }[]
    canDecide: boolean
  }[]
}

export function priceAfterDiscount(price: number, percent: number) {
  if (!Number.isFinite(price) || !Number.isFinite(percent)) return null
  const hundredths = Math.round(percent * 100)
  if (hundredths < 0 || hundredths > 10000) return null
  return Math.round((price * (10000 - hundredths)) / 10000)
}
