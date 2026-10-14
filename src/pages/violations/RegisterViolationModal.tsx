import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { appendFiles } from './files'
import { ViolationForm } from './ViolationForm'

export function RegisterViolationModal({
  nationalId,
  caseId,
  onClose,
}: {
  nationalId: string
  caseId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      if (
        document.querySelector(
          '[role="listbox"], [role="menu"], [data-confirm-toast], .rmdp-wrapper, [data-enter-ignore][aria-expanded="true"]',
        )
      ) {
        return
      }
      const modals = document.querySelectorAll('[aria-modal="true"]')
      const top = modals[modals.length - 1]
      if (dialogRef.current && top !== dialogRef.current) return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-3" data-nested-dialog>
      <button type="button" className="absolute inset-0 cursor-default bg-ink-900/40" aria-label={t('common.close')} onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('violations.create')}
        className="relative z-10 w-full max-w-[min(96rem,calc(100vw-1rem))]"
      >
        <ViolationForm
          preset={{ nationalId, caseId }}
          onCancel={onClose}
          onSubmit={async (payload) => {
            const body = new FormData()
            body.append('nationalId', payload.nationalId)
            body.append('violationTypeId', payload.violationTypeId)
            body.append('occurredAt', payload.occurredAt)
            body.append('description', payload.description ?? '')
            body.append('status', payload.status)
            body.append('caseUserId', payload.caseUserId ?? '')
            appendFiles(body, payload.files)
            await api.post('/violations', body)
            toast.success(t('violations.created'))
            await queryClient.invalidateQueries({ queryKey: ['cases', 'home', caseId] })
            await queryClient.invalidateQueries({ queryKey: ['violations'] })
            onClose()
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
