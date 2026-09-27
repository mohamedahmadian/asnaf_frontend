import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { LoadingSpinner } from './LoadingState'

export type UniqueCheckStatus = 'idle' | 'checking' | 'ok' | 'taken'

export function UniqueFieldWrap({
  status,
  children,
  availableLabel,
  checkingLabel,
}: {
  status: UniqueCheckStatus
  children: ReactNode
  availableLabel: string
  checkingLabel: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      {status === 'checking' ? (
        <span className="shrink-0" role="status" aria-live="polite" aria-label={checkingLabel}>
          <LoadingSpinner size="xs" />
        </span>
      ) : null}
      {status === 'ok' ? (
        <span className="shrink-0" role="status" aria-live="polite" aria-label={availableLabel}>
          <Check className="size-5 text-emerald-600" strokeWidth={2.75} aria-hidden />
        </span>
      ) : null}
    </div>
  )
}
