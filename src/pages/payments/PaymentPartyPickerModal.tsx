import { BadgeCheck, Building2, IdCard, Phone, UserRound, Users, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { personTypes, type PaymentParty } from '../../types/app'

function InfoBadge({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
      <Icon className="size-3 shrink-0 text-teal-600" aria-hidden />
      {value}
    </span>
  )
}

export function PaymentPartyPickerModal({
  parties,
  onPick,
  onClose,
}: {
  parties: PaymentParty[]
  onPick: (party: PaymentParty) => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const dialogRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>('button[data-party-option]')?.focus()
    })
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      const modals = document.querySelectorAll('[aria-modal="true"]')
      if (dialogRef.current && modals[modals.length - 1] !== dialogRef.current) return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  function moveFocus(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const options = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-party-option]') ?? [],
    )
    if (options.length === 0) return
    event.preventDefault()
    const current = options.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    options[(current + step + options.length) % options.length]?.focus()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
      data-nested-dialog
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink-900/40"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('payments.partyPicker.title')}
        className="relative z-10 w-full max-w-2xl"
      >
        <FormCard
          icon={Users}
          title={t('payments.partyPicker.title')}
          subtitle={t('payments.partyPicker.subtitle', { value: formatNumber(parties.length, locale) })}
          className="flex max-h-[calc(100vh-2rem)] flex-col"
          action={
            <Button type="button" variant="ghost" icon aria-label={t('common.close')} onClick={onClose}>
              <X className="size-4" aria-hidden />
            </Button>
          }
        >
          <ul
            ref={listRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 sm:p-5"
            onKeyDown={moveFocus}
          >
            {parties.map((party) => {
              const legal = party.personType === personTypes.LEGAL
              const Icon = legal ? Building2 : UserRound
              return (
                <li key={party.id}>
                  <button
                    type="button"
                    data-party-option
                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-teal-100 bg-white p-3 text-start transition hover:border-teal-300 hover:bg-teal-50/60 focus-visible:border-teal-400 focus-visible:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                    onClick={() => onPick(party)}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink-900">
                          {legal ? party.companyName || party.fullName : party.fullName}
                        </span>
                        <span className="rounded-full bg-mint-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                          {t(`personTypes.${party.personType}`)}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {!legal && party.nationalId ? (
                          <InfoBadge icon={IdCard} value={localizeDigits(party.nationalId, locale)} />
                        ) : null}
                        {legal && party.companyNationalId ? (
                          <InfoBadge icon={IdCard} value={localizeDigits(party.companyNationalId, locale)} />
                        ) : null}
                        {party.phone ? (
                          <InfoBadge icon={Phone} value={localizeDigits(party.phone, locale)} />
                        ) : null}
                        {!legal ? (
                          <InfoBadge
                            icon={BadgeCheck}
                            value={
                              party.cases.length > 0
                                ? t('payments.partyPicker.caseCount', {
                                    value: formatNumber(party.cases.length, locale),
                                  })
                                : t('payments.partyPicker.noCases')
                            }
                          />
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </FormCard>
      </div>
    </div>,
    document.body,
  )
}
