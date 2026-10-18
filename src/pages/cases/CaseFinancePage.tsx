import {
  Banknote,
  CircleCheck,
  Clock3,
  CircleDashed,
  ClipboardList,
  Eye,
  Landmark,
  ListOrdered,
  Percent,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Settings,
  Store,
  Trash2,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthProvider'
import { AmountInput } from '../../components/ui/AmountInput'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { DateText } from '../../components/ui/DateText'
import {
  AppForm,
  Button,
  EntityNameSubtitle,
  FormActions,
  FormField,
  LoadingState,
  PageHeader,
  caseShellClassName,
} from '../../components/ui/Form'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormMetaChip,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { ActionsTh, TableCard, actionsColClassName } from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { confirmToast } from '../../components/ui/confirmToast'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, formatNumber, localizeDigits, parseGroupedAmount } from '../../lib/datetime'
import { hasPermission } from '../../lib/roles'
import type {
  CaseFileFinance,
  CaseFinance,
  CaseFinanceHead,
  CaseRequestFeeStatus,
  CaseRequestFinance,
  PaymentRecord,
} from '../../types/app'
import { bankAccountOptionLabel } from '../municipal-fees/MunicipalFeeForm'
import { PaymentMethodBadge, PaymentStatusBadge } from '../payments/PaymentBadges'
import { PaymentDetailCard } from '../payments/PaymentDetailPage'
import { PaymentForm, type PaymentPrefill } from '../payments/PaymentPage'

const headerChipClassName =
  'inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800'

type FeeLine = {
  municipalFeeId: string
  title: string
  amount: string
  isActive: boolean
  status: CaseRequestFeeStatus
  discount: number
}

const feeStatusStyles: Record<CaseRequestFeeStatus, { icon: LucideIcon; className: string }> = {
  PAID: {
    icon: CircleCheck,
    className: 'bg-teal-50 text-teal-700 ring-teal-200',
  },
  PENDING: {
    icon: Clock3,
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  UNPAID: {
    icon: CircleDashed,
    className: 'bg-cream-50 text-ink-600 ring-line',
  },
}

function FeeStatusBadge({ status }: { status: CaseRequestFeeStatus }) {
  const { t } = useTranslation()
  const { icon: Icon, className } = feeStatusStyles[status]
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${className}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {t(`caseFinance.feeStatuses.${status}`)}
    </span>
  )
}

function toLines(finance: NonNullable<CaseFinance['finance']>): FeeLine[] {
  return finance.fees.map((fee) => ({
    municipalFeeId: fee.municipalFeeId,
    title: fee.title,
    amount: String(fee.amount),
    isActive: fee.isActive,
    status: fee.status,
    discount: fee.discount,
  }))
}

function FeesEditor({
  caseId,
  requestId,
  finance,
  payAllLabel,
  onPay,
}: {
  caseId: string
  requestId: string
  finance: NonNullable<CaseFinance['finance']>
  payAllLabel: string
  /** بدون آن (نداشتن دسترسی پرداخت) دکمهٔ پرداخت دیده نمی‌شود */
  onPay?: (feeIds: string[]) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [lines, setLines] = useState<FeeLine[]>(() => toLines(finance))
  const savedUnpaidIds = finance.fees.filter((fee) => fee.status === 'UNPAID').map((fee) => fee.municipalFeeId)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const addOptions = useMemo(() => {
    const used = new Set(lines.map((line) => line.municipalFeeId))
    const removed = finance.fees
      .filter((fee) => !used.has(fee.municipalFeeId) && fee.isActive)
      .map((fee) => ({
        id: fee.municipalFeeId,
        title: fee.title,
        amount: fee.amount,
      }))
    return [...finance.availableFees.filter((fee) => !used.has(fee.id)), ...removed].map((fee) => ({
      value: fee.id,
      label: `${fee.title} — ${formatGroupedNumber(fee.amount, locale)}`,
      fee,
    }))
  }, [finance, lines, locale])

  const savingRef = useRef(false)
  const savedAmounts = useMemo(() => new Map(finance.fees.map((fee) => [fee.municipalFeeId, fee.amount])), [finance])
  const isDirty = (line: FeeLine) => parseGroupedAmount(line.amount) !== savedAmounts.get(line.municipalFeeId)

  async function persist(next: FeeLine[], successMessage: string) {
    if (savingRef.current) return false
    const amounts = next.map((line) => parseGroupedAmount(line.amount))
    if (amounts.some((amount) => amount == null)) {
      toast.error(t('payments.amountInvalid'))
      return false
    }
    savingRef.current = true
    setSaving(true)
    try {
      await api.put(
        `/case-finance/${caseId}/fees`,
        {
          fees: next.map((line, index) => ({
            municipalFeeId: line.municipalFeeId,
            amount: amounts[index],
          })),
        },
        { params: { requestId } },
      )
      await queryClient.invalidateQueries({
        queryKey: ['case-finance', caseId],
      })
      toast.success(successMessage)
      return true
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function saveIfChanged() {
    if (lines.some(isDirty)) void persist(lines, t('caseFinance.feesSaved'))
  }

  async function addFee(feeId: string, amount: string) {
    const option = addOptions.find((item) => item.value === feeId)
    if (!option || saving) return
    const next: FeeLine[] = [
      ...lines,
      {
        municipalFeeId: option.fee.id,
        title: option.fee.title,
        amount,
        isActive: true,
        status: 'UNPAID',
        discount: 0,
      },
    ]
    if (await persist(next, t('caseFinance.feeAdded'))) setAdding(false)
  }

  function removeFee(line: FeeLine) {
    confirmToast({
      title: t('caseFinance.removeFeeConfirm', { value: line.title }),
      confirmLabel: t('common.yesDelete'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        const next = lines.filter((item) => item.municipalFeeId !== line.municipalFeeId)
        setLines(next)
        await persist(next, t('caseFinance.feeRemoved'))
      },
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    saveIfChanged()
  }

  const total = lines.reduce((sum, line) => sum + (parseGroupedAmount(line.amount) ?? 0), 0)

  return (
    <>
      <AppForm onSubmit={submit} className={formCardBodyClassName} autoFocusFirst={false} data-enter-immediate>
        <TableCard empty={t('caseFinance.noFees')} hasRows rowClick={false}>
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-ink-700">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('payments.feeTitle')}</th>
                <th className="w-64 px-4 py-3 text-start font-medium">{t('payments.feeAmount')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('caseFinance.feeStatus')}</th>
                <ActionsTh>
                  <Button
                    type="button"
                    variant="soft"
                    className="!h-8 !gap-1 !rounded-xl !px-2.5 !py-1 !text-xs [&_svg]:size-3.5"
                    disabled={saving || addOptions.length === 0}
                    title={addOptions.length === 0 ? t('caseFinance.noMoreFees') : undefined}
                    onClick={() => setAdding(true)}
                  >
                    <Plus className="size-4" aria-hidden />
                    {t('caseFinance.addFee')}
                  </Button>
                </ActionsTh>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-500">
                    {t('caseFinance.noFees')}
                  </td>
                </tr>
              ) : null}
              {lines.map((line) => {
                const locked = line.status !== 'UNPAID'
                return (
                  <tr key={line.municipalFeeId} className="border-t border-line">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {line.status === 'PAID' ? (
                          <CircleCheck
                            className="size-5 shrink-0 text-emerald-600"
                            aria-label={t('caseFinance.feeStatuses.PAID')}
                          />
                        ) : null}
                        {line.title}
                        {line.isActive ? '' : ` (${t('payments.inactiveFee')})`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {locked ? (
                        formatGroupedNumber(parseGroupedAmount(line.amount) ?? 0, locale)
                      ) : (
                        <AmountInput
                          id={`case-fee-${requestId}-${line.municipalFeeId}`}
                          value={line.amount}
                          required
                          onBlur={saveIfChanged}
                          onChange={(next) =>
                            setLines((current) =>
                              current.map((item) =>
                                item.municipalFeeId === line.municipalFeeId ? { ...item, amount: next } : item,
                              ),
                            )
                          }
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <FeeStatusBadge status={line.status} />
                        {line.status !== 'UNPAID' && line.discount > 0 ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-mint-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-mint-300">
                            <Percent className="size-3.5" aria-hidden />
                            {t('caseFinance.discountBadge', {
                              value: formatGroupedNumber(line.discount, locale),
                            })}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className={actionsColClassName} data-row-actions>
                      {locked ? null : (
                        <div className="flex flex-nowrap items-center gap-2">
                          {onPay && savedUnpaidIds.includes(line.municipalFeeId) ? (
                            <Button
                              type="button"
                              variant="soft"
                              className="!h-8 !gap-1 !rounded-xl !px-2.5 !py-1 !text-xs [&_svg]:size-3.5"
                              disabled={saving}
                              onClick={() => onPay([line.municipalFeeId])}
                            >
                              <Banknote className="size-4" aria-hidden />
                              {t('caseFinance.pay')}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            icon
                            aria-label={t('caseFinance.removeFee')}
                            title={t('caseFinance.removeFee')}
                            disabled={saving}
                            onClick={() => removeFee(line)}
                          >
                            <Trash2 className="size-4 text-red-600" aria-hidden />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {lines.length > 0 ? (
              <tfoot>
                <tr className="border-t border-line bg-cream-50 text-ink-800">
                  <td className="px-4 py-4 text-base font-semibold">{t('caseFinance.totalFees')}</td>
                  <td className="px-4 py-4 text-xl font-bold text-teal-700" colSpan={2}>
                    {formatGroupedNumber(total, locale)}
                  </td>
                  <td className={actionsColClassName}>
                    {onPay && savedUnpaidIds.length > 0 ? (
                      <Button
                        type="button"
                        className="!h-8 !gap-1 !rounded-xl !px-2.5 !py-1 !text-xs [&_svg]:size-3.5"
                        disabled={saving}
                        onClick={() => onPay(savedUnpaidIds)}
                      >
                        <Banknote className="size-4" aria-hidden />
                        {payAllLabel}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </TableCard>
      </AppForm>
      {adding ? (
        <AddFeeModal
          requestId={requestId}
          options={addOptions}
          saving={saving}
          onSubmit={(feeId, amount) => void addFee(feeId, amount)}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </>
  )
}

function AddFeeModal({
  requestId,
  options,
  saving,
  onSubmit,
  onClose,
}: {
  requestId: string
  options: {
    value: string
    label: string
    fee: { id: string; amount: number }
  }[]
  saving: boolean
  onSubmit: (feeId: string, amount: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [feeId, setFeeId] = useState('')
  const [amount, setAmount] = useState('')

  function selectFee(next: string) {
    setFeeId(next)
    const option = options.find((item) => item.value === next)
    setAmount(option ? String(option.fee.amount) : '')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!feeId) {
      toast.error(t('caseFinance.selectFee'))
      return
    }
    onSubmit(feeId, amount)
  }

  return (
    <FinanceModal label={t('caseFinance.addFee')} onClose={onClose} widthClassName="max-w-xl">
      <FormCard
        icon={Banknote}
        title={t('caseFinance.addFee')}
        action={
          <Button
            type="button"
            variant="ghost"
            icon
            aria-label={t('common.close')}
            title={t('common.close')}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        }
      >
        <AppForm onSubmit={submit} className={formCardBodyClassName} autoFocusFirst>
          <FormField icon={ReceiptText} label={t('payments.feeTitle')} htmlFor={`case-fee-add-${requestId}`}>
            <SearchSelect
              id={`case-fee-add-${requestId}`}
              value={feeId}
              onChange={selectFee}
              placeholder={t('caseFinance.selectFee')}
              options={options.map(({ value, label }) => ({ value, label }))}
            />
          </FormField>
          <FormField icon={Banknote} label={t('payments.feeAmount')} htmlFor={`case-fee-add-amount-${requestId}`}>
            <AmountInput id={`case-fee-add-amount-${requestId}`} value={amount} required onChange={setAmount} />
          </FormField>
          <FormActions
            submitLabel={t('caseFinance.addFeeButton')}
            cancelLabel={t('common.cancel')}
            submitting={saving}
            onCancel={onClose}
            headerIcons={false}
          />
        </AppForm>
      </FormCard>
    </FinanceModal>
  )
}

function requestLabel(request: { type: string; number: string }, t: (key: string) => string, locale: string) {
  return `${t(`cases.requestTypes.${request.type}`)} — ${localizeDigits(request.number, locale)}`
}

export function FinanceSubtitle({ head, request }: { head: CaseFinanceHead; request?: CaseFinance['request'] }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <EntityNameSubtitle icon={UserRound} name={head.payer.fullName} />
      {head.caseFile.businessUnitTitle ? (
        <span className={headerChipClassName}>
          <Store className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{head.caseFile.businessUnitTitle}</span>
        </span>
      ) : null}
      {head.payer.phone ? (
        <span className={headerChipClassName}>
          <Phone className="size-4 shrink-0" aria-hidden />
          <CopyableDigits value={head.payer.phone} />
        </span>
      ) : null}
      {request ? (
        <span className={headerChipClassName}>
          <ClipboardList className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{requestLabel(request, t, locale)}</span>
        </span>
      ) : null}
    </span>
  )
}

export function FinanceTotals({ totals, onPayAll }: { totals: CaseFinance['totals']; onPayAll?: () => void }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  return (
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
      <FormFactTile
        icon={Banknote}
        label={t('caseFinance.totalFees')}
        value={formatGroupedNumber(totals.total, locale)}
      />
      <FormFactTile
        icon={CircleCheck}
        tone="mint"
        label={t('caseFinance.paidAmount')}
        value={formatGroupedNumber(totals.paid, locale)}
      />
      <FormFactTile
        icon={Percent}
        label={t('caseFinance.discountAmount')}
        value={formatGroupedNumber(totals.discount, locale)}
      />
      <FormFactTile
        icon={Wallet}
        tone="mint"
        label={t('caseFinance.remainingAmount')}
        value={formatGroupedNumber(totals.remaining + totals.pending, locale)}
        action={
          onPayAll ? (
            <Button
              type="button"
              className="!h-8 !gap-1 !rounded-xl !px-2.5 !py-1 !text-xs [&_svg]:size-3.5"
              onClick={onPayAll}
            >
              <Banknote className="size-4" aria-hidden />
              {t('caseFinance.payAllFees')}
            </Button>
          ) : undefined
        }
      />
    </div>
  )
}

export function RequestFeesCard({
  caseId,
  item,
  title,
  onPay,
}: {
  caseId: string
  item: CaseRequestFinance
  title: string
  onPay?: (feeIds: string[]) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canSettings = hasPermission(user, 'finance.settings')
  const requestId = item.request.id
  const finance = item.finance
  const hasActivePayment = item.payments.some((payment) => !payment.deletedAt && payment.status !== 'FAILED')
  const feesKey = finance
    ? finance.fees.map((fee) => `${fee.municipalFeeId}:${fee.amount}:${fee.status}:${fee.discount}`).join('|')
    : ''

  function askReset() {
    confirmToast({
      title: t('caseFinance.resetConfirm'),
      confirmLabel: t('caseFinance.reset'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await api.post(`/case-finance/${caseId}/reset`, null, {
            params: { requestId },
          })
          await queryClient.invalidateQueries({
            queryKey: ['case-finance', caseId],
          })
          toast.success(t('caseFinance.resetDone'))
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
        }
      },
    })
  }

  return (
    <FormCard
      icon={Banknote}
      title={title}
      chips={
        finance ? (
          <FormMetaChip
            icon={Landmark}
            label={bankAccountOptionLabel(finance.bankAccount, locale, t('geo.inactive'))}
          />
        ) : undefined
      }
      action={
        finance && item.hasSettings && !hasActivePayment ? (
          <Button type="button" variant="ghost" onClick={askReset}>
            <RotateCcw className="size-4" aria-hidden />
            {t('caseFinance.reset')}
          </Button>
        ) : undefined
      }
    >
      {finance ? (
        <>
          {item.settingsAccountChanged ? (
            <p className="mx-5 mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 sm:mx-6">
              {t('caseFinance.settingsAccountChanged')}
            </p>
          ) : null}
          <FeesEditor
            key={feesKey}
            caseId={caseId}
            requestId={requestId}
            finance={finance}
            payAllLabel={t('caseFinance.payAllOfType', {
              type: t(`cases.requestTypes.${item.request.type}`),
            })}
            onPay={onPay}
          />
        </>
      ) : (
        <div className="space-y-3 p-5 sm:p-6">
          <FormEmptyHint>{t('caseFinance.noSettings')}</FormEmptyHint>
          {canSettings ? (
            <Link to="/finance/settings">
              <Button type="button" variant="ghost">
                <Settings className="size-4" aria-hidden />
                {t('menus.financialSettings')}
              </Button>
            </Link>
          ) : null}
        </div>
      )}
    </FormCard>
  )
}

export function PaymentsCard({
  payments,
  onView,
  title,
  action,
  toolbar,
  showRequest = false,
}: {
  payments: PaymentRecord[]
  onView: (paymentId: string) => void
  title?: string
  action?: ReactNode
  toolbar?: ReactNode
  showRequest?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  return (
    <FormCard icon={ReceiptText} title={title ?? t('caseFinance.paymentsTitle')} action={action}>
      <div className="space-y-4 p-5 sm:p-6">
        {toolbar}
        <TableCard empty={t('caseFinance.noPayments')} hasRows={payments.length > 0}>
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-ink-700">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('payments.receiptNumber')}</th>
                {showRequest ? <th className="px-4 py-3 text-start font-medium">{t('payments.caseRequest')}</th> : null}
                <th className="px-4 py-3 text-start font-medium">{t('payments.paidAt')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('payments.method')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('payments.status')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('payments.totalAmount')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('payments.discountAmount')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('payments.finalAmount')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('payments.recordedBy')}</th>
                <ActionsTh />
              </tr>
            </thead>
            <tbody>
              {payments.map((item) => (
                <tr key={item.id} className={`border-t border-line ${item.deletedAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium" dir="ltr">
                    {localizeDigits(item.receiptNumber, locale)}
                  </td>
                  {showRequest ? (
                    <td className="px-4 py-3">{item.caseRequest ? requestLabel(item.caseRequest, t, locale) : '—'}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    {item.paidAt ? <DateText value={item.paidAt} withTime /> : <span className="text-ink-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentMethodBadge method={item.method} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={item.status} deleted={Boolean(item.deletedAt)} />
                  </td>
                  <td className="px-4 py-3">{formatGroupedNumber(item.subtotal, locale)}</td>
                  <td className="px-4 py-3">{formatGroupedNumber(item.discountAmount, locale)}</td>
                  <td className="px-4 py-3 font-medium">{formatGroupedNumber(item.finalAmount, locale)}</td>
                  <td className="px-4 py-3">{item.recordedBy.fullName}</td>
                  <td className={actionsColClassName}>
                    <div data-row-actions className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                      <Button type="button" variant="ghost" data-row-view="" onClick={() => onView(item.id)}>
                        <Eye className="size-4" aria-hidden />
                        {t('common.view')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </FormCard>
  )
}

type PayTarget = { requestId: string; feeIds: string[] }

function unpaidFeeIds(item: CaseRequestFinance) {
  return (item.finance?.fees ?? []).filter((fee) => fee.status === 'UNPAID').map((fee) => fee.municipalFeeId)
}

/**
 * وضعیت مودال‌های ثبت پرداخت و جزئیات پرداخت؛ درخواست از دادهٔ تازه پیدا می‌شود.
 * هر پرداخت فقط به یک درخواست (و حساب آن) تعلق دارد؛ «پرداخت همه» صفی از درخواست‌ها می‌سازد
 * و بعد از هر پرداخت موفق مودال درخواست بعدی باز می‌شود.
 */
function useFinanceModals(head: CaseFinanceHead | undefined, items: CaseRequestFinance[]) {
  const { user } = useAuth()
  const canPay = hasPermission(user, 'finance.payments')
  const [queue, setQueue] = useState<PayTarget[]>([])
  const [introTargets, setIntroTargets] = useState<PayTarget[] | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const closePayment = useCallback(() => setQueue([]), [])
  const closeIntro = useCallback(() => setIntroTargets(null), [])
  const nextPayment = useCallback(() => setQueue((current) => current.slice(1)), [])
  const closeDetail = useCallback(() => setViewingId(null), [])
  const payTarget = queue[0]
  const payItem = payTarget ? items.find((item) => item.request.id === payTarget.requestId) : undefined

  const payFor = (item: CaseRequestFinance) =>
    canPay && item.finance ? (feeIds: string[]) => setQueue([{ requestId: item.request.id, feeIds }]) : undefined

  const allTargets = canPay
    ? items
        .filter((item) => item.finance)
        .map((item) => ({
          requestId: item.request.id,
          feeIds: unpaidFeeIds(item),
        }))
        .filter((target) => target.feeIds.length > 0)
    : []
  const payAll =
    allTargets.length > 0
      ? () => (allTargets.length > 1 ? setIntroTargets(allTargets) : setQueue(allTargets))
      : undefined

  const modals = (
    <>
      {introTargets ? (
        <PayAllIntroModal
          items={introTargets
            .map((target) => items.find((item) => item.request.id === target.requestId))
            .filter((item): item is CaseRequestFinance => Boolean(item))}
          onStart={() => {
            setQueue(introTargets)
            setIntroTargets(null)
          }}
          onClose={closeIntro}
        />
      ) : null}
      {head && payTarget && payItem?.finance ? (
        <CasePaymentModal
          key={payTarget.requestId}
          head={head}
          item={payItem}
          finance={payItem.finance}
          selectedIds={payTarget.feeIds}
          onDone={nextPayment}
          onClose={closePayment}
        />
      ) : null}
      {viewingId ? <CasePaymentDetailModal paymentId={viewingId} onClose={closeDetail} /> : null}
    </>
  )
  return { payFor, payAll, view: setViewingId, modals }
}

export function CaseFinancePage() {
  const { t } = useTranslation()
  const { id: caseId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const requestedId = searchParams.get('requestId') ?? ''

  const query = useQuery({
    queryKey: ['case-finance', caseId, requestedId],
    enabled: Boolean(caseId),
    queryFn: async () =>
      (
        await api.get<CaseFinance>(`/case-finance/${caseId}`, {
          params: requestedId ? { requestId: requestedId } : undefined,
        })
      ).data,
  })
  const data = query.data
  const { payFor, payAll, view, modals } = useFinanceModals(data, data ? [data] : [])
  const pay = data ? payFor(data) : undefined
  const unpaidIds = data ? unpaidFeeIds(data) : []

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Wallet}
        title={t('caseFinance.title')}
        subtitle={data ? <FinanceSubtitle head={data} request={data.request} /> : t('caseFinance.subtitle')}
      />

      {query.isPending ? (
        <LoadingState />
      ) : query.isError || !data ? (
        <FormEmptyHint>{getApiErrorMessage(query.error, t('common.error'))}</FormEmptyHint>
      ) : (
        <div className="space-y-5">
          <FinanceTotals totals={data.totals} onPayAll={payAll} />
          <RequestFeesCard caseId={caseId} item={data} title={t('caseFinance.feesTitle')} onPay={pay} />
          <PaymentsCard
            payments={data.payments}
            onView={view}
            action={
              pay && unpaidIds.length > 0 ? (
                <Button type="button" onClick={() => pay(unpaidIds)}>
                  <Banknote className="size-4" aria-hidden />
                  {t('caseFinance.recordPayment')}
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
      {modals}
    </div>
  )
}

export function CaseFileFinancePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id: caseId = '' } = useParams()

  const query = useQuery({
    queryKey: ['case-finance', caseId, 'all'],
    enabled: Boolean(caseId),
    queryFn: async () => (await api.get<CaseFileFinance>(`/case-finance/${caseId}/all`)).data,
  })
  const data = query.data
  const items = useMemo(() => data?.items ?? [], [data])
  const { payFor, payAll, view, modals } = useFinanceModals(data, items)
  const [paymentsRequestId, setPaymentsRequestId] = useState('')
  const payments = useMemo(
    () =>
      items
        .filter((item) => !paymentsRequestId || item.request.id === paymentsRequestId)
        .flatMap((item) => item.payments)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)),
    [items, paymentsRequestId],
  )
  const allPaymentCount = items.reduce((sum, item) => sum + item.payments.length, 0)
  const paymentFilters = [
    { id: '', label: t('caseFinance.allRequests'), count: allPaymentCount },
    ...items.map((item) => ({
      id: item.request.id,
      label: requestLabel(item.request, t, locale),
      count: item.payments.length,
    })),
  ]

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Wallet}
        title={t('caseFinance.caseTitle')}
        subtitle={data ? <FinanceSubtitle head={data} /> : t('caseFinance.caseSubtitle')}
        backTo={`/cases/${caseId}`}
      />

      {query.isPending ? (
        <LoadingState />
      ) : query.isError || !data ? (
        <FormEmptyHint>{getApiErrorMessage(query.error, t('common.error'))}</FormEmptyHint>
      ) : (
        <div className="space-y-5">
          <FinanceTotals totals={data.totals} onPayAll={payAll} />
          {items.length === 0 ? <FormEmptyHint>{t('caseFinance.noRequests')}</FormEmptyHint> : null}
          {items.map((item) => (
            <RequestFeesCard
              key={item.request.id}
              caseId={caseId}
              item={item}
              title={requestLabel(item.request, t, locale)}
              onPay={payFor(item)}
            />
          ))}
          <PaymentsCard
            payments={payments}
            onView={view}
            title={t('caseFinance.casePaymentsTitle')}
            showRequest
            toolbar={
              items.length > 1 ? (
                <div className="flex flex-wrap gap-2" role="group" aria-label={t('caseFinance.filterByRequest')}>
                  {paymentFilters.map((filter) => {
                    const active = filter.id === paymentsRequestId
                    return (
                      <button
                        key={filter.id || 'all'}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setPaymentsRequestId(filter.id)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                          active
                            ? 'bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white shadow-[0_6px_14px_rgba(46,189,182,0.28)]'
                            : 'bg-white text-ink-700 ring-1 ring-teal-200 hover:bg-teal-50'
                        }`}
                      >
                        <ClipboardList className="size-3.5" aria-hidden />
                        {filter.label}
                        <span
                          className={`rounded-full px-1.5 text-[11px] font-semibold ${
                            active ? 'bg-white/25 text-white' : 'bg-teal-50 text-teal-700'
                          }`}
                        >
                          {formatNumber(filter.count, locale)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : undefined
            }
          />
        </div>
      )}
      {modals}
    </div>
  )
}

function FinanceModal({
  label,
  onClose,
  widthClassName = 'max-w-4xl',
  children,
}: {
  label: string
  onClose: () => void
  widthClassName?: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true })
  }, [])

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4" data-nested-dialog>
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
        aria-label={label}
        tabIndex={-1}
        className={`relative z-10 max-h-[calc(100vh-2rem)] w-full ${widthClassName} overflow-y-auto rounded-3xl outline-none`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

function PayAllIntroModal({
  items,
  onStart,
  onClose,
}: {
  items: CaseRequestFinance[]
  onStart: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  return (
    <FinanceModal label={t('caseFinance.payAllIntroTitle')} onClose={onClose}>
      <FormCard
        icon={ListOrdered}
        title={t('caseFinance.payAllIntroTitle')}
        action={
          <Button
            type="button"
            variant="ghost"
            icon
            aria-label={t('common.close')}
            title={t('common.close')}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        }
      >
        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-sm leading-7 text-ink-700">
            {t('caseFinance.payAllIntro', {
              count: formatNumber(items.length, locale),
            })}
          </p>
          <ol className="space-y-2">
            {items.map((item, index) => {
              const unpaid = (item.finance?.fees ?? [])
                .filter((fee) => fee.status === 'UNPAID')
                .reduce((sum, fee) => sum + fee.amount, 0)
              return (
                <li
                  key={item.request.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
                      {formatNumber(index + 1, locale)}
                    </span>
                    <span className="truncate font-medium text-ink-900">{requestLabel(item.request, t, locale)}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-teal-700">{formatGroupedNumber(unpaid, locale)}</span>
                </li>
              )
            })}
          </ol>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              <X className="size-4" aria-hidden />
              {t('common.cancel')}
            </Button>
            <Button type="button" autoFocus onClick={onStart}>
              <Banknote className="size-4" aria-hidden />
              {t('caseFinance.payAllStart')}
            </Button>
          </div>
        </div>
      </FormCard>
    </FinanceModal>
  )
}

function CasePaymentModal({
  head,
  item,
  finance,
  selectedIds,
  onDone,
  onClose,
}: {
  head: CaseFinanceHead
  item: CaseRequestFinance
  finance: NonNullable<CaseFinance['finance']>
  selectedIds: string[]
  onDone: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const prefill: PaymentPrefill = {
    party: {
      userId: head.payer.id,
      caseFileId: head.caseFile.id,
      party: { ...head.payer, cases: [] },
      caseFile: head.caseFile,
    },
    request: item.request,
    bankAccount: finance.bankAccount,
    fees: finance.fees
      .filter((fee) => fee.status === 'UNPAID')
      .map((fee) => ({
        id: fee.municipalFeeId,
        title: fee.title,
        amount: fee.amount,
        isActive: fee.isActive,
        selected: selectedIds.includes(fee.municipalFeeId),
      })),
    onDone,
    onClose,
  }

  return (
    <FinanceModal label={t('caseFinance.recordPayment')} onClose={onClose}>
      <PaymentForm prefill={prefill} />
    </FinanceModal>
  )
}

function CasePaymentDetailModal({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['payment-history', 'detail', paymentId],
    queryFn: async () => (await api.get<PaymentRecord>(`/payment-history/${paymentId}`)).data,
  })

  return (
    <FinanceModal label={t('payments.details')} onClose={onClose}>
      {query.data ? (
        <PaymentDetailCard
          payment={query.data}
          onDeleted={() => {
            void queryClient.invalidateQueries({ queryKey: ['case-finance'] })
            onClose()
          }}
          action={
            <Button
              type="button"
              variant="ghost"
              icon
              aria-label={t('common.close')}
              title={t('common.close')}
              onClick={onClose}
            >
              <X className="size-4" aria-hidden />
            </Button>
          }
        />
      ) : (
        <div className="rounded-3xl bg-white p-6">
          {query.isError ? (
            <FormEmptyHint>{getApiErrorMessage(query.error, t('common.error'))}</FormEmptyHint>
          ) : (
            <LoadingState />
          )}
        </div>
      )}
    </FinanceModal>
  )
}
