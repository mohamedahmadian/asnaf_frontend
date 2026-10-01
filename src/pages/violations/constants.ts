import type { ViolationStatus } from '../../types/app'

export const VIOLATION_STATUSES: ViolationStatus[] = [
  'REGISTERED',
  'UNDER_REVIEW',
  'NOTICE',
  'REFERRED',
  'VERDICT_ISSUED',
  'CLOSED',
  'DISMISSED',
]

export const VIOLATION_FILE_ACCEPT =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip'
