import { CalendarDays, MessageSquareText, Phone, Send, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { SmsMessageLog } from '../../pages/sms/sms'
import { smsStatusClass } from '../../pages/sms/sms'
import { DateText } from '../ui/DateText'
import { Button } from '../ui/Form'
import { FormCard, FormFactTile, formCardBodyClassName } from '../ui/FormLayout'

export function SmsMessageBodyModal({
  message,
  onClose,
}: {
  message: SmsMessageLog
  onClose: () => void
}) {
  const { t } = useTranslation()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('sms.bodyModalTitle')}
      data-nested-dialog
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <FormCard
        icon={MessageSquareText}
        title={t('sms.bodyModalTitle')}
        className="relative z-10 w-full max-w-lg"
        onDoubleClick={() => undefined}
        action={
          <Button type="button" variant="ghost" icon onClick={onClose} aria-label={t('common.close')}>
            <X className="size-4" aria-hidden />
          </Button>
        }
      >
        <div className={formCardBodyClassName}>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Phone}
              label={t('sms.recipient')}
              copyValue={message.phone}
              tone="teal"
            />
            <FormFactTile
              icon={CalendarDays}
              label={t('sms.sentAt')}
              value={<DateText value={message.createdAt} withTime />}
              tone="mint"
            />
            <FormFactTile
              icon={Send}
              label={t('sms.sendStatus')}
              value={
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${smsStatusClass[message.status]}`}
                >
                  {t(`sms.statuses.${message.status}`)}
                </span>
              }
            />
          </div>
          <div className="rounded-2xl border border-teal-100 bg-cream-50 p-4">
            <p className="mb-2 text-xs font-medium text-ink-500">{t('sms.body')}</p>
            <p className="whitespace-pre-wrap text-sm leading-7 text-ink-900">{message.body}</p>
          </div>
        </div>
      </FormCard>
    </div>,
    document.body,
  )
}
