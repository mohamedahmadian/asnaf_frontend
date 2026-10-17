import {
  Banknote,
  CircleDot,
  ClipboardList,
  Copy,
  CreditCard,
  FileText,
  Globe,
  Hash,
  History,
  IdCard,
  Landmark,
  Layers,
  Link2,
  Percent,
  Phone,
  Send,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import {
  Button,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormMetaChip, FormSectionTitle } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, formatNumber, localizeDigits } from '../../lib/datetime'
import type { GatewayRedirect, PaymentLinkSms, PaymentRecord } from '../../types/app'
import { bankAccountOptionLabel } from '../municipal-fees/MunicipalFeeForm'
import { PaymentMethodBadge, PaymentStatusBadge } from './PaymentBadges'
import { PaymentReceipts } from './PaymentReceipts'
import { paymentCaseLabel, submitToGateway } from './payment-shared'
import { canDeletePayment, usePaymentDelete } from './usePaymentDelete'

export function PaymentDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const deletePayment = usePaymentDelete()
  const [busy, setBusy] = useState<'gateway' | 'link' | null>(null)
  const query = useQuery({
    queryKey: ['payment-history', 'detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<PaymentRecord>(`/payment-history/${id}`)
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

  const payment = query.data
  if (!payment) {
    return <LoadingState />
  }

  const discountLabel =
    payment.discountMode === 'CATALOG'
      ? payment.discountTitle || t('payments.discountCatalog')
      : t('payments.discountManual')
  const isDeleted = Boolean(payment.deletedAt)
  const canRetryOnline = !isDeleted && payment.method === 'ONLINE' && payment.status !== 'PAID'
  const attempts = payment.gatewayTransactions ?? []

  async function payOnline() {
    if (!payment) return
    setBusy('gateway')
    try {
      const { data } = await api.post<GatewayRedirect>(`/payments/${payment.id}/gateway`)
      toast.info(t('payments.redirectingToGateway'))
      submitToGateway(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
      setBusy(null)
    }
  }

  async function resendLink() {
    if (!payment) return
    setBusy('link')
    try {
      const { data } = await api.post<PaymentLinkSms>(`/payments/${payment.id}/pay-link`)
      if (data.sent) toast.success(t('payments.linkSent'))
      else toast.warning(t(data.reason === 'NO_PHONE' ? 'payments.linkNeedsPhone' : 'payments.smsUnavailable'))
      await queryClient.invalidateQueries({ queryKey: ['payment-history'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setBusy(null)
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('common.copied'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={History}
        title={t('payments.details')}
        subtitle={<EntityNameSubtitle name={payment.payerName} icon={UserRound} />}
      />
      <FormCard
        icon={Banknote}
        title={payment.payerName}
        subtitle={t('payments.receiptNumberValue', { value: localizeDigits(payment.receiptNumber, locale) })}
        chips={
          <>
            <PaymentMethodBadge method={payment.method} />
            <PaymentStatusBadge status={payment.status} deleted={isDeleted} />
            <FormMetaChip icon={Banknote} label={formatGroupedNumber(payment.finalAmount, locale)} />
          </>
        }
      >
        <div className="space-y-6 p-5 sm:p-6">
          {isDeleted ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
              <Trash2 className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
              <div className="space-y-1">
                <p className="font-semibold text-red-700">{t('payments.deletedNotice')}</p>
                <p className="text-ink-700">
                  {t('payments.deletedBy', { name: payment.deletedBy?.fullName ?? '—' })}
                  {' · '}
                  {payment.deletedAt ? <DateText value={payment.deletedAt} withTime /> : null}
                </p>
                {payment.deleteReason ? (
                  <p className="text-ink-700">
                    {t('payments.deleteReason')}: {payment.deleteReason}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <FormSectionTitle icon={UserRound}>{t('payments.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Hash}
              label={t('payments.receiptNumber')}
              value={<span dir="ltr">{localizeDigits(payment.receiptNumber, locale)}</span>}
              tone="teal"
            />
            <FormFactTile
              icon={History}
              label={t('payments.paidAt')}
              value={payment.paidAt ? <DateText value={payment.paidAt} withTime /> : '—'}
              tone="mint"
            />
            <FormFactTile icon={Wallet} label={t('payments.method')} value={t(`payments.methods.${payment.method}`)} />
            <FormFactTile
              icon={CircleDot}
              label={t('payments.status')}
              value={isDeleted ? t('payments.deleted') : t(`payments.statuses.${payment.status}`)}
              tone="teal"
            />
            <FormFactTile
              icon={CreditCard}
              label={t('payments.trackingCode')}
              value={payment.trackingCode ? <span dir="ltr">{localizeDigits(payment.trackingCode, locale)}</span> : '—'}
              tone="mint"
            />
            <FormFactTile icon={UserRound} label={t('payments.recordedBy')} value={payment.recordedBy.fullName} />
            <FormFactTile
              icon={UserRound}
              label={t('payments.payer')}
              value={
                payment.currentPayerName ? (
                  <>
                    {payment.payerName}
                    <span className="block text-xs font-normal text-ink-500">
                      {t('payments.currentName', { value: payment.currentPayerName })}
                    </span>
                  </>
                ) : (
                  payment.payerName
                )
              }
              tone="teal"
            />
            {payment.personType === 'LEGAL' ? (
              <FormFactTile icon={IdCard} label={t('payments.companyNationalId')} copyValue={payment.companyNationalId} />
            ) : (
              <FormFactTile icon={IdCard} label={t('payments.nationalId')} copyValue={payment.nationalId} />
            )}
            {payment.personType === 'LEGAL' && payment.companyRegistrationNo ? (
              <FormFactTile
                icon={Hash}
                label={t('payments.companyRegistrationNo')}
                value={localizeDigits(payment.companyRegistrationNo, locale)}
              />
            ) : null}
            {payment.payerPhone ? (
              <FormFactTile icon={Phone} label={t('payments.payerPhone')} copyValue={payment.payerPhone} />
            ) : null}
            <FormFactTile
              icon={Wallet}
              label={t('payments.caseFile')}
              value={
                payment.caseFile
                  ? paymentCaseLabel(payment.caseFile, locale)
                  : t(payment.personType === 'LEGAL' ? 'payments.onCompanyName' : 'payments.onPersonName')
              }
            />
            {payment.caseFile ? (
              <FormFactTile
                icon={Hash}
                label={t('cases.filterCaseKind')}
                value={`${t(`payments.caseKind.${payment.caseFile.kind}`)} · ${t(`cases.caseStatuses.${payment.caseFile.status}`)}`}
                tone="mint"
              />
            ) : null}
            {payment.caseRequest ? (
              <FormFactTile
                icon={ClipboardList}
                label={t('payments.caseRequest')}
                value={`${localizeDigits(payment.caseRequest.number, locale)} — ${t(`cases.requestTypes.${payment.caseRequest.type}`)}`}
              />
            ) : null}
            <FormFactTile
              icon={Landmark}
              label={t('payments.bankAccount')}
              value={bankAccountOptionLabel(payment.bankAccount, locale, t('geo.inactive'))}
            />
            <FormFactTile
              icon={Layers}
              label={t('payments.group')}
              value={payment.paymentGroupTitle || t('payments.allGroups')}
              tone="teal"
            />
            <FormFactTile icon={Hash} label={t('payments.feeCount')} value={formatNumber(payment.feeCount, locale)} />
            <FormFactTile
              icon={Banknote}
              label={t('payments.totalAmount')}
              value={formatGroupedNumber(payment.subtotal, locale)}
              tone="mint"
            />
            <FormFactTile icon={Percent} label={t('payments.discount')} value={discountLabel} />
            <FormFactTile
              icon={Percent}
              label={t('payments.discountAmount')}
              value={formatGroupedNumber(payment.discountAmount, locale)}
              tone="teal"
            />
            <FormFactTile
              icon={Banknote}
              label={t('payments.finalAmount')}
              value={formatGroupedNumber(payment.finalAmount, locale)}
              tone="mint"
            />
            {payment.description ? (
              <FormFactTile icon={FileText} label={t('payments.description')} value={payment.description} />
            ) : null}
          </div>

          {payment.payLink ? (
            <div className="space-y-3">
              <FormSectionTitle icon={Link2}>{t('payments.payLink')}</FormSectionTitle>
              <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
                <p className="truncate rounded-xl bg-white px-3 py-2 text-xs text-ink-700" dir="ltr">
                  {payment.payLink.url}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                  <span>
                    {t('payments.linkExpiresAt')}:{' '}
                    {payment.payLink.expiresAt ? <DateText value={payment.payLink.expiresAt} withTime /> : '—'}
                  </span>
                  <span>
                    {t('payments.linkSentAt')}:{' '}
                    {payment.payLink.sentAt ? <DateText value={payment.payLink.sentAt} withTime /> : '—'}
                  </span>
                  <span className={payment.payLink.open ? 'text-teal-700' : 'text-red-600'}>
                    {t(payment.payLink.open ? 'payments.linkOpen' : 'payments.linkClosed')}
                  </span>
                </div>
                {payment.payLink.open ? (
                  <Button type="button" variant="ghost" onClick={() => void copyLink(payment.payLink!.url)}>
                    <Copy className="size-4" aria-hidden />
                    {t('payments.copyLink')}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <FormSectionTitle icon={Banknote}>{t('payments.lines')}</FormSectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <th className="px-4 py-3 text-start">{t('payments.feeTitle')}</th>
                  <th className="px-4 py-3 text-start">{t('payments.feeAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {(payment.lines ?? []).map((line) => (
                  <tr key={line.id} className="border-t border-line">
                    <td className="px-4 py-3">{line.title}</td>
                    <td className="px-4 py-3">{formatGroupedNumber(line.amount, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {attempts.length > 0 ? (
            <div className="space-y-3">
              <FormSectionTitle icon={Globe}>{t('payments.gatewayAttempts')}</FormSectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('payments.attemptAt')}</th>
                      <th className="px-4 py-3 text-start">{t('payments.onlineChannel')}</th>
                      <th className="px-4 py-3 text-start">{t('payments.attemptOrderId')}</th>
                      <th className="px-4 py-3 text-start">{t('payments.status')}</th>
                      <th className="px-4 py-3 text-start">{t('payments.trackingCode')}</th>
                      <th className="px-4 py-3 text-start">{t('payments.cardPan')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="border-t border-line">
                        <td className="px-4 py-3">
                          <DateText value={attempt.createdAt} withTime />
                        </td>
                        <td className="px-4 py-3">{t(`payments.onlineChannels.${attempt.channel}`)}</td>
                        <td className="px-4 py-3" dir="ltr">
                          {localizeDigits(attempt.orderId, locale)}
                        </td>
                        <td className="px-4 py-3">
                          {t(`payments.attemptStatuses.${attempt.status}`)}
                          {attempt.resCode && attempt.resCode !== '0' ? (
                            <span className="block text-xs text-ink-500">
                              {t('payments.bankCode', { value: localizeDigits(attempt.resCode, locale) })}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          {attempt.saleReferenceId ? localizeDigits(attempt.saleReferenceId, locale) : '—'}
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          {attempt.cardHolderPan ? localizeDigits(attempt.cardHolderPan, locale) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <PaymentReceipts paymentId={payment.id} receipts={payment.receipts ?? []} readOnly={isDeleted} />

          {canRetryOnline || canDeletePayment(payment) ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/70 to-white p-4">
              <div className="flex flex-wrap gap-2">
                {canDeletePayment(payment) ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => deletePayment(payment, () => navigate('/finance/payment-history'))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {t('payments.delete')}
                  </Button>
                ) : null}
              </div>
              {canRetryOnline ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="soft" disabled={busy !== null} onClick={() => void payOnline()}>
                    <Globe className="size-4" aria-hidden />
                    {busy === 'gateway' ? t('payments.redirectingToGateway') : t('payments.payOnlineNow')}
                  </Button>
                  {payment.payLink ? (
                    <Button type="button" variant="soft" disabled={busy !== null} onClick={() => void resendLink()}>
                      <Send className="size-4" aria-hidden />
                      {t('payments.resendLink')}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}
