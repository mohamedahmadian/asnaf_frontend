export const smsMessageStatuses = ['SKIPPED', 'SENT', 'FAILED'] as const
export const smsMessageSources = ['MANUAL', 'PASSWORD', 'PAYMENT_LINK', 'STEWARDSHIP'] as const

export type SmsMessageStatus = (typeof smsMessageStatuses)[number]
export type SmsMessageSource = (typeof smsMessageSources)[number]

export type SmsMessageLog = {
  id: string
  phone: string
  body: string
  status: SmsMessageStatus
  source: SmsMessageSource
  createdAt: string
}

export const smsStatusClass: Record<SmsMessageStatus, string> = {
  SKIPPED: 'bg-amber-50 text-amber-800 ring-amber-200',
  SENT: 'bg-teal-50 text-teal-800 ring-teal-200',
  FAILED: 'bg-red-50 text-red-700 ring-red-200',
}
