import { CalendarDays, Check, Gavel, Package, Percent, ShieldCheck, UserRound, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormField,
  PageHeader,
  caseShellClassName,
  fieldClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { confirmToast } from '../../components/ui/confirmToast'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, localizeDigits } from '../../lib/datetime'
import { type AuctionApprovalStatus, type AuctionRequest } from './auction'

const approvalTone: Record<AuctionApprovalStatus, string> = {
  PENDING: 'bg-teal-50 text-teal-900 ring-teal-200',
  APPROVED: 'bg-mint-50 text-teal-900 ring-mint-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
}

function percentText(value: number, locale: string) {
  const rounded = Math.round(value * 100) / 100
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded)
  return `${localizeDigits(text, locale)}٪`
}

export function CaseAuctionDetailPage() {
  const { id = '', requestId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const redirected = useRef(false)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['cases', 'auction', id, requestId],
    enabled: Boolean(id && requestId),
    queryFn: async () => (await api.get<AuctionRequest>(`/cases/${id}/auction/${requestId}`)).data,
  })

  useEffect(() => {
    if (!query.isError || redirected.current) return
    redirected.current = true
    toast.error(getApiErrorMessage(query.error, t('common.error')))
    navigate(`/cases/${id}?stay=1`, { replace: true })
  }, [id, navigate, query.error, query.isError, t])

  const item = query.data
  const backTo = `/cases/${id}?stay=1`

  async function decide(approvalId: string, status: 'APPROVED' | 'REJECTED') {
    const note = notes[approvalId]?.trim() ?? ''
    if (status === 'REJECTED' && !note) {
      toast.error(t('cases.auction.rejectNote'))
      return
    }
    setSavingId(approvalId)
    try {
      await api.post(`/cases/${id}/auction/${requestId}/approvals/${approvalId}`, {
        status,
        note: note || null,
      })
      toast.success(t('cases.auction.decided'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'auction', id, requestId] })
      await queryClient.invalidateQueries({ queryKey: ['cases', 'home', id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSavingId(null)
    }
  }

  function askApprove(approvalId: string, kind: AuctionRequest['approvals'][number]['kind']) {
    confirmToast({
      title: t('cases.auction.approveConfirm', { name: t(`cases.auction.kinds.${kind}`) }),
      confirmLabel: t('cases.auction.approve'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => void decide(approvalId, 'APPROVED'),
    })
  }

  function askReject(approvalId: string) {
    if (!notes[approvalId]?.trim()) {
      toast.error(t('cases.auction.rejectNote'))
      return
    }
    confirmToast({
      title: t('cases.auction.rejectConfirm'),
      confirmLabel: t('cases.auction.reject'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: () => void decide(approvalId, 'REJECTED'),
    })
  }

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Gavel}
        title={t('cases.auction.details')}
        subtitle={
          item ? (
            <EntityNameSubtitle icon={Gavel} label={t('cases.requestNumber')} name={localizeDigits(item.number, locale)} />
          ) : undefined
        }
        backTo={backTo}
      />
      {query.isLoading ? <LoadingState /> : null}
      {item ? (
        <FormCard icon={Gavel} title={localizeDigits(item.number, locale)}>
          <div className={formCardBodyClassName}>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <FormFactTile icon={CalendarDays} label={t('cases.auction.startsAt')} value={<DateText value={item.startsAt} />} />
              <FormFactTile icon={CalendarDays} label={t('cases.auction.endsAt')} value={<DateText value={item.endsAt} />} />
              <FormFactTile icon={Percent} label={t('cases.auction.discountFrom')} value={percentText(item.discountMin, locale)} />
              <FormFactTile icon={Percent} label={t('cases.auction.discountTo')} value={percentText(item.discountMax, locale)} tone="mint" />
            </div>
            <FormSectionTitle icon={Package}>{t('cases.auction.items')}</FormSectionTitle>
            <div className="overflow-x-auto rounded-2xl border border-teal-100">
              <table className="w-full text-sm">
                <thead className="bg-cream-50 text-ink-700">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium">{t('cases.auction.itemName')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('cases.auction.itemPrice')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('cases.auction.itemDiscount')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('cases.auction.itemPriceAfter')}</th>
                  </tr>
                </thead>
                <tbody>
                  {item.items.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{formatGroupedNumber(row.price, locale)}</td>
                      <td className="px-4 py-3">{percentText(row.discountPercent, locale)}</td>
                      <td className="px-4 py-3">{formatGroupedNumber(row.priceAfterDiscount, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FormSectionTitle icon={ShieldCheck}>{t('cases.auction.approvals')}</FormSectionTitle>
            <p className="text-sm text-ink-500">{t('cases.auction.approvalsHint')}</p>
            <div className="space-y-3">
              {item.approvals.map((approval) => (
                <article key={approval.id} className="space-y-3 rounded-2xl border border-teal-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink-900">{t(`cases.auction.kinds.${approval.kind}`)}</h3>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${approvalTone[approval.status]}`}>
                      {t(`cases.auction.approvalStatus.${approval.status}`)}
                    </span>
                  </div>
                  <p className="flex items-start gap-2 text-sm text-ink-600">
                    <UserRound className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
                    <span>
                      <span className="text-ink-500">{t('cases.auction.approverPeople')}: </span>
                      {approval.people.length
                        ? approval.people.map((person) => person.fullName).join('، ')
                        : t('cases.auction.approverEmpty')}
                    </span>
                  </p>
                  {approval.decidedBy ? (
                    <p className="text-sm text-ink-600">
                      {approval.decidedBy.fullName}
                      {approval.decidedAt ? (
                        <>
                          {' '}
                          <DateText value={approval.decidedAt} withTime />
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  {approval.kind === 'SPECIAL_INSPECTOR' || approval.kind === 'AUCTION_COMMITTEE' ? (
                    <p className="text-sm leading-7 text-ink-800">
                      {t(approval.kind === 'SPECIAL_INSPECTOR' ? 'cases.auction.inspectorDefaultNote' : 'cases.auction.committeeDefaultNote')}
                    </p>
                  ) : null}
                  {approval.note ? <p className="text-sm text-ink-700">{approval.note}</p> : null}
                  {approval.canDecide ? (
                    <div className="space-y-3">
                      <FormField icon={ShieldCheck} label={t('cases.auction.note')} htmlFor={`auctionNote-${approval.id}`}>
                        <textarea
                          id={`auctionNote-${approval.id}`}
                          className={fieldClassName}
                          rows={3}
                          maxLength={2000}
                          value={notes[approval.id] ?? ''}
                          onChange={(event) =>
                            setNotes((current) => ({ ...current, [approval.id]: event.target.value }))
                          }
                        />
                      </FormField>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={savingId === approval.id}
                          onClick={() => askApprove(approval.id, approval.kind)}
                        >
                          <Check className="size-4" aria-hidden />
                          {t('cases.auction.approve')}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={savingId === approval.id}
                          onClick={() => askReject(approval.id)}
                        >
                          <X className="size-4" aria-hidden />
                          {t('cases.auction.reject')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            {item.editable ? (
              <DetailActions editTo={`/cases/${id}/auction/${item.id}/edit`} editLabel={t('common.edit')} />
            ) : null}
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}
