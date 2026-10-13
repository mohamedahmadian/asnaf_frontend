import { Check, CircleAlert, UserRound, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { Button } from '../../components/ui/Form'
import type { StewardRow } from './CaseStewardsSection'

function dependentStatusKey(row: StewardRow) {
  if (row.status === 'REVOKED') return 'revoked'
  if (row.cardNumber && row.requestStatus !== 'OPEN') return 'active'
  return 'reviewing'
}

const STATUS_BADGE: Record<ReturnType<typeof dependentStatusKey>, string> = {
  reviewing: 'bg-amber-50 text-amber-900 ring-amber-200',
  active: 'bg-mint-50 text-teal-900 ring-mint-200',
  revoked: 'bg-red-50 text-red-700 ring-red-200',
}

export function CaseDeleteDependentsDialog({
  rows,
  pending,
  onClose,
  onConfirm,
}: {
  rows: StewardRow[]
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.repeat || event.isComposing || pending) return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, pending])

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/30 p-4" data-nested-dialog>
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('common.close')}
        onClick={() => {
          if (!pending) onClose()
        }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-delete-dependents-title"
        className="relative z-10 flex max-h-[min(36rem,90dvh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="shrink-0 bg-gradient-to-e from-red-50 via-white to-rose-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-[0_8px_16px_rgba(220,38,38,0.28)]">
              <CircleAlert className="size-5" aria-hidden />
            </span>
            <h2 id="case-delete-dependents-title" className="text-sm font-semibold text-ink-900">
              {t('cases.deleteDependentsTitle')}
            </h2>
          </div>
        </header>
        <div className="min-h-0 space-y-3 overflow-y-auto p-5">
          <p className="text-sm leading-7 text-ink-800">{t('cases.deleteDependentsWarning')}</p>
          <ul className="space-y-2">
            {rows.map((row) => {
              const statusKey = dependentStatusKey(row)
              const caseNumber = row.cardNumber || row.requestNumber
              return (
                <li key={row.id}>
                  <div
                    role="link"
                    tabIndex={0}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-cream-50 px-3 py-2.5 hover:bg-teal-50"
                    onClick={() => {
                      if (pending) return
                      onClose()
                      navigate(`/cases/${row.id}`)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || pending) return
                      if (event.target instanceof HTMLElement && event.target.closest('button')) return
                      event.preventDefault()
                      onClose()
                      navigate(`/cases/${row.id}`)
                    }}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 ring-1 ring-teal-200">
                      <UserRound className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">{row.fullName || '—'}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-2">
                        {row.nationalId ? (
                          <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-ink-800 ring-1 ring-teal-200">
                            <CopyableDigits value={row.nationalId} />
                          </span>
                        ) : null}
                        {caseNumber ? (
                          <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-900 ring-1 ring-teal-200">
                            <CopyableDigits value={caseNumber} />
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_BADGE[statusKey]}`}>
                      {t(`cases.stewardship.${statusKey}`)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
            <X className="size-4" aria-hidden />
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="danger" disabled={pending} onClick={onConfirm}>
            <Check className="size-4" aria-hidden />
            {t('common.yesDelete')}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
