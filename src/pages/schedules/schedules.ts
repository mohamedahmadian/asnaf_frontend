export type ScheduledJob = {
  code: string
  enabled: boolean
  nameKey: string
  descriptionKey: string
  scheduleKey: string
  scheduleKind: string
  lastRunAt: string | null
  lastStatus: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | null
  lastMessage: string | null
  running: boolean
}

export type ScheduledJobRun = {
  id: string
  jobCode: string
  trigger: 'SYSTEM' | 'MANUAL'
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'
  startedAt: string
  finishedAt: string | null
  message: string | null
  detail: { total?: number; changed?: number } | null
  triggeredBy: { id: string; fullName: string } | null
}

export function schedulesPath() {
  return '/management/schedules'
}

export function schedulePath(code: string) {
  return `/management/schedules/${encodeURIComponent(code)}`
}

export const scheduleStatusClass: Record<NonNullable<ScheduledJob['lastStatus']>, string> = {
  RUNNING: 'bg-teal-50 text-teal-900 ring-teal-200',
  SUCCESS: 'bg-mint-50 text-teal-900 ring-mint-200',
  FAILED: 'bg-red-50 text-red-700 ring-red-200',
  SKIPPED: 'bg-cream-50 text-ink-600 ring-line',
}
