import { Banknote, CircleCheck, CircleX, Clock3, CreditCard, Globe, Hash, Landmark, Percent, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthGuestLayout, AuthNotice } from '../../components/auth/AuthGuestLayout'
import { DateText } from '../../components/ui/DateText'
import { Button, LoadingState } from '../../components/ui/Form'
import { FormCard, FormFactTile } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { integerToPersianWords } from '../../lib/amount-words'
import { formatGroupedNumber, localizeDigits } from '../../lib/datetime'
import type { GatewayRedirect, PublicPaymentSummary } from '../../types/app'
import { submitToGateway } from './payment-shared'

export function PublicPaymentPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { token = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [redirecting, setRedirecting] = useState(false)
  const query = useQuery({
    queryKey: ['public-payment', token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const { data } = await api.get<PublicPaymentSummary>(`/public/payments/${encodeURIComponent(token)}`)
      return data
    },
  })

  const gatewayResult = searchParams.get('gateway')
  useEffect(() => {
    if (!gatewayResult) return
    if (gatewayResult === 'ok') toast.success(t('payments.gatewaySuccess'))
    else toast.error(t('payments.gatewayFailed'))
    const next = new URLSearchParams(searchParams)
    next.delete('gateway')
    setSearchParams(next, { replace: true })
  }, [gatewayResult, searchParams, setSearchParams, t])

  async function pay() {
    setRedirecting(true)
    try {
      const { data } = await api.post<GatewayRedirect>(`/public/payments/${encodeURIComponent(token)}/gateway`)
      submitToGateway(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
      setRedirecting(false)
      void query.refetch()
    }
  }

  if (query.isLoading) {
    return (
      <AuthGuestLayout wide>
        <LoadingState />
      </AuthGuestLayout>
    )
  }

  const payment = query.data
  if (!payment) {
    return (
      <AuthGuestLayout wide>
        <AuthNotice icon={CircleX} tone="warn">
          {t('payments.publicInvalid')}
        </AuthNotice>
      </AuthGuestLayout>
    )
  }

  const words = integerToPersianWords(payment.finalAmount)

  return (
    <AuthGuestLayout wide>
      <FormCard
        icon={Banknote}
        title={t('payments.publicTitle')}
        subtitle={t('payments.receiptNumberValue', { value: localizeDigits(payment.receiptNumber, locale) })}
      >
        <div className="space-y-5 p-5 sm:p-6">
          {payment.status === 'PAID' ? (
            <AuthNotice icon={CircleCheck} tone="mint">
              <p className="font-semibold">{t('payments.publicPaid')}</p>
              {payment.trackingCode ? (
                <p>
                  {t('payments.trackingCode')}: <span dir="ltr">{localizeDigits(payment.trackingCode, locale)}</span>
                </p>
              ) : null}
              {payment.paidAt ? <DateText value={payment.paidAt} withTime /> : null}
            </AuthNotice>
          ) : payment.open ? (
            <AuthNotice icon={Clock3}>
              {t('payments.publicPending')}
              {payment.expiresAt ? (
                <span className="block text-xs text-ink-500">
                  {t('payments.linkExpiresAt')}: <DateText value={payment.expiresAt} withTime />
                </span>
              ) : null}
            </AuthNotice>
          ) : (
            <AuthNotice icon={CircleX} tone="warn">
              {t('payments.publicClosed')}
            </AuthNotice>
          )}

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={UserRound} label={t('payments.payer')} value={payment.payerName} tone="teal" />
            <FormFactTile
              icon={Hash}
              label={t('payments.receiptNumber')}
              value={<span dir="ltr">{localizeDigits(payment.receiptNumber, locale)}</span>}
            />
            <FormFactTile icon={Landmark} label={t('payments.bankName')} value={payment.bankName} />
            <FormFactTile icon={CreditCard} label={t('payments.gatewayName')} value={t('payments.mellatGateway')} tone="mint" />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <th className="px-4 py-3 text-start">{t('payments.feeTitle')}</th>
                  <th className="px-4 py-3 text-start">{t('payments.feeAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {payment.lines.map((line) => (
                  <tr key={line.id} className="border-t border-line">
                    <td className="px-4 py-3">{line.title}</td>
                    <td className="px-4 py-3">{formatGroupedNumber(line.amount, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Banknote}
              label={t('payments.totalAmount')}
              value={formatGroupedNumber(payment.subtotal, locale)}
            />
            <FormFactTile
              icon={Percent}
              label={t('payments.discountAmount')}
              value={formatGroupedNumber(payment.discountAmount, locale)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
              <p className="text-sm text-ink-500">{t('payments.finalAmount')}</p>
              <p className="text-xl font-bold text-teal-800">
                {formatGroupedNumber(payment.finalAmount, locale)} {t('payments.rial')}
              </p>
              {words ? <p className="text-xs text-ink-500">{t('common.amountEquivalent', { value: words })}</p> : null}
            </div>
            {payment.open ? (
              <Button type="button" disabled={redirecting} onClick={() => void pay()}>
                <Globe className="size-4" aria-hidden />
                {redirecting ? t('payments.redirectingToGateway') : t('payments.payOnlineNow')}
              </Button>
            ) : null}
          </div>
        </div>
      </FormCard>
    </AuthGuestLayout>
  )
}
