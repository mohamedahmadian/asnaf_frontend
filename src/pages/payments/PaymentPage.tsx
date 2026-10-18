import {
  Banknote,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  Globe,
  Hash,
  ImagePlus,
  Landmark,
  Layers,
  Link2,
  MessageSquareText,
  MonitorSmartphone,
  Percent,
  Send,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { integerToPersianWords } from '../../lib/amount-words'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { AmountInput } from '../../components/ui/AmountInput'
import {
  AppForm,
  Button,
  FormField,
  PageHeader,
  fieldClassName,
  formShellClassName,
} from '../../components/ui/Form'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { FileDropField } from '../../components/ui/FileDropField'
import { api, getApiErrorMessage } from '../../lib/api'
import {
  formatGroupedNumber,
  formatNumber,
  groupAmountInput,
  localizeDigits,
  parseGroupedAmount,
  toLatinDigits,
} from '../../lib/datetime'
import { optimizeImageFile } from '../../lib/optimize-image'
import type {
  BankAccount,
  CaseFinance,
  Discount,
  GatewayRedirect,
  MunicipalFee,
  OnlinePaymentChannel,
  Paginated,
  PaymentGroup,
  PaymentMethod,
  PaymentRecord,
} from '../../types/app'
import { bankAccountOptionLabel } from '../municipal-fees/MunicipalFeeForm'
import { paymentMethodIcons } from './PaymentBadges'
import { PaymentGroupsModal } from './PaymentGroupsModal'
import { PaymentPartySearch, type PartySelection } from './PaymentPartySearch'
import { ALL_PAYMENT_GROUPS, asItemList, discountShare, submitToGateway } from './payment-shared'

const MIN_ONLINE_AMOUNT = 1000

type CreatedLink = { id: string; receiptNumber: string; url: string }

function AmountStat({
  icon: Icon,
  label,
  value,
  hint,
  highlight = false,
}: {
  icon: typeof Globe
  label: string
  value: string
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex min-w-0 items-start gap-3 rounded-2xl border p-4 ${
        highlight
          ? 'border-teal-300 bg-teal-50 shadow-[0_8px_20px_rgba(46,189,182,0.16)]'
          : 'border-teal-100 bg-white shadow-[0_6px_16px_rgba(46,189,182,0.06)]'
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          highlight ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-600'
        }`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className={`truncate font-bold ${highlight ? 'text-xl text-teal-800' : 'text-lg text-ink-900'}`}>
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-xs leading-5 text-ink-500">{hint}</p> : null}
      </div>
    </div>
  )
}

function ChoiceTile({
  selected,
  icon: Icon,
  title,
  hint,
  onSelect,
}: {
  selected: boolean
  icon: typeof Globe
  title: string
  hint?: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border p-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
        selected
          ? 'border-teal-500 bg-teal-50 shadow-[0_8px_20px_rgba(46,189,182,0.16)] ring-2 ring-teal-200'
          : 'border-teal-100 bg-white hover:border-teal-300'
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          selected ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-600'
        }`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink-900">{title}</span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-500">{hint}</span> : null}
      </span>
    </button>
  )
}

type FeeLine = {
  feeId: string
  title: string
  amount: string
  included: boolean
  isActive: boolean
}

/** پرداخت داخل مودال امور مالی یک درخواست؛ پرداخت‌کننده، حساب و هزینه‌های پرداخت‌نشده ثابت می‌آیند */
export type PaymentPrefill = {
  party: PartySelection
  request: CaseFinance['request']
  bankAccount: NonNullable<CaseFinance['finance']>['bankAccount']
  fees: { id: string; title: string; amount: number; isActive: boolean; selected: boolean }[]
  onDone: () => void
  onClose: () => void
}

export function PaymentPage() {
  return <PaymentForm />
}

export function PaymentForm({ prefill }: { prefill?: PaymentPrefill }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [party, setParty] = useState<PartySelection | null>(prefill?.party ?? null)
  const [resetKey, setResetKey] = useState(0)
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState<string>(ALL_PAYMENT_GROUPS)
  const [accountId, setAccountId] = useState(prefill?.bankAccount.id ?? '')
  const [lines, setLines] = useState<FeeLine[]>([])
  const [discountMode, setDiscountMode] = useState<'manual' | 'catalog'>('manual')
  const [discountId, setDiscountId] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountTouched, setDiscountTouched] = useState(false)
  const [caseRequestId, setCaseRequestId] = useState(prefill?.request.id ?? '')
  const [method, setMethod] = useState<PaymentMethod | ''>(prefill ? 'POS' : '')
  const [onlineChannel, setOnlineChannel] = useState<OnlinePaymentChannel>('OPERATOR')
  const [trackingCode, setTrackingCode] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptKey, setReceiptKey] = useState(0)
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const caseRequests = party?.caseFile?.requests ?? []
  const payerPhone = party?.party.phone ?? null

  const groupsQuery = useQuery({
    queryKey: ['payment-groups'],
    queryFn: async () => {
      const { data } = await api.get<PaymentGroup[]>('/payment-groups')
      return data
    },
  })
  const accountsQuery = useQuery({
    queryKey: ['bank-accounts', 'lookup', 'payments'],
    queryFn: async () => {
      const { data } = await api.get<BankAccount[] | Paginated<BankAccount>>('/bank-accounts')
      return asItemList(data)
    },
  })
  const discountsQuery = useQuery({
    queryKey: ['discounts', 'lookup', 'payments'],
    queryFn: async () => {
      const { data } = await api.get<Discount[] | Paginated<Discount>>('/discounts', {
        params: { isActive: true },
      })
      return asItemList(data)
    },
  })
  const accountFeesQuery = useQuery({
    queryKey: ['municipal-fees', 'payment', accountId],
    enabled: !prefill && groupId === ALL_PAYMENT_GROUPS && Boolean(accountId),
    queryFn: async () => {
      const { data } = await api.get<MunicipalFee[] | Paginated<MunicipalFee>>('/municipal-fees', {
        params: { bankAccountId: accountId, isActive: true },
      })
      return asItemList(data)
    },
  })

  const groups = groupsQuery.data ?? []
  const selectedGroup = groups.find((group) => group.id === groupId)
  const activeAccounts = useMemo(
    () => (accountsQuery.data ?? []).filter((account) => account.isActive),
    [accountsQuery.data],
  )
  const onlyAccountId = activeAccounts.length === 1 ? activeAccounts[0].id : ''

  useEffect(() => {
    if (groupId === ALL_PAYMENT_GROUPS && !accountId && onlyAccountId) {
      setAccountId(onlyAccountId)
    }
  }, [groupId, accountId, onlyAccountId])
  const sourceFees = useMemo(() => {
    if (prefill) return prefill.fees
    if (groupId === ALL_PAYMENT_GROUPS) {
      return (accountFeesQuery.data ?? []).map((fee) => ({
        id: fee.id,
        title: fee.title,
        amount: fee.amount,
        isActive: fee.isActive,
      }))
    }
    if (!selectedGroup) return []
    return selectedGroup.fees
  }, [prefill, groupId, accountFeesQuery.data, selectedGroup])
  const sourceKey = `${groupId}|${groupId === ALL_PAYMENT_GROUPS ? accountId : ''}|${sourceFees
    .map((fee) => `${fee.id}:${fee.amount}:${fee.isActive}`)
    .join(',')}`
  const feesReady =
    Boolean(prefill) ||
    !groupId ||
    (groupId === ALL_PAYMENT_GROUPS
      ? !accountId || accountFeesQuery.isSuccess
      : groupsQuery.isSuccess)
  const sourceFeesRef = useRef(sourceFees)
  sourceFeesRef.current = sourceFees

  useEffect(() => {
    if (!feesReady) return
    setLines(
      sourceFeesRef.current.map((fee) => ({
        feeId: fee.id,
        title: fee.title,
        amount: String(fee.amount),
        included: 'selected' in fee ? fee.selected === true : true,
        isActive: fee.isActive,
      })),
    )
    setDiscountTouched(false)
  }, [sourceKey, feesReady])

  const included = lines.filter((line) => line.included)
  const parsedLines = included.map((line) => parseGroupedAmount(line.amount))
  const amountsValid = parsedLines.every((amount) => amount != null)
  const subtotal = parsedLines.reduce<number>((sum, amount) => sum + (amount ?? 0), 0)
  const selectedDiscount = (discountsQuery.data ?? []).find((item) => item.id === discountId)
  const discountPercent = selectedDiscount?.percent

  useEffect(() => {
    if (discountMode !== 'catalog' || discountTouched || discountPercent == null) return
    setDiscountAmount(String(discountShare(subtotal, discountPercent)))
  }, [discountMode, discountTouched, discountId, discountPercent, subtotal])

  const discountValue = parseGroupedAmount(discountAmount) ?? 0
  const finalAmount = subtotal - discountValue
  const finalWords = finalAmount >= 0 ? integerToPersianWords(finalAmount) : ''
  const allIncluded = lines.length > 0 && lines.every((line) => line.included)
  const someIncluded = lines.some((line) => line.included)
  const trackingVisible = (method === 'POS' || method === 'BANK_RECEIPT') && finalAmount > 0
  const inModal = Boolean(prefill)
  const modalReadyRef = useRef(false)
  const hasLines = lines.length > 0

  useEffect(() => {
    if (!inModal || !hasLines || modalReadyRef.current) return
    const frame = requestAnimationFrame(() => {
      const submit = document.getElementById('payment-submit')
      if (!submit) return
      modalReadyRef.current = true
      document.getElementById('payment-tracking-code')?.focus({ preventScroll: true })
      submit.scrollIntoView({ block: 'end', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [inModal, hasLines])

  function chooseGroup(next: string) {
    setGroupId(next)
    if (next && next !== ALL_PAYMENT_GROUPS) {
      setAccountId(groups.find((group) => group.id === next)?.bankAccountId ?? '')
      return
    }
    setAccountId('')
  }

  async function submit() {
    if (!party) {
      toast.error(t('payments.partyRequired'))
      return
    }
    if (!groupId) {
      toast.error(t('payments.groupRequired'))
      return
    }
    if (!accountId) {
      toast.error(t('payments.accountRequired'))
      return
    }
    if (included.length === 0) {
      toast.error(t('payments.feesRequired'))
      return
    }
    if (!amountsValid) {
      toast.error(t('payments.amountInvalid'))
      return
    }
    if (discountMode === 'catalog' && !discountId) {
      toast.error(t('payments.discountRequired'))
      return
    }
    if (discountValue > subtotal) {
      toast.error(t('payments.discountTooHigh'))
      return
    }
    if (!method) {
      toast.error(t('payments.methodRequired'))
      return
    }
    if (method !== 'ONLINE' && finalAmount > 0 && !trackingCode.trim()) {
      toast.error(t(method === 'POS' ? 'payments.posTrackingCodeRequired' : 'payments.receiptTrackingCodeRequired'))
      document.getElementById('payment-tracking-code')?.focus()
      return
    }
    if (method === 'ONLINE' && finalAmount < MIN_ONLINE_AMOUNT) {
      toast.error(t('payments.onlineMinAmount'))
      return
    }
    if (method === 'ONLINE' && onlineChannel === 'PUBLIC_LINK' && !payerPhone) {
      toast.error(t('payments.linkNeedsPhone'))
      return
    }
    setSubmitting(true)
    let redirecting = false
    try {
      const { data: payment } = await api.post<PaymentRecord>('/payments', {
        payerUserId: party.userId,
        caseFileId: party.caseFileId,
        caseRequestId: party.caseFileId && caseRequestId ? caseRequestId : null,
        method,
        onlineChannel: method === 'ONLINE' ? onlineChannel : undefined,
        trackingCode: method === 'ONLINE' ? undefined : toLatinDigits(trackingCode.trim()) || null,
        description: description.trim() || null,
        paymentGroupId: groupId === ALL_PAYMENT_GROUPS ? null : groupId,
        bankAccountId: accountId,
        discountMode: discountMode === 'catalog' ? 'CATALOG' : 'MANUAL',
        discountId: discountMode === 'catalog' ? discountId : null,
        discountAmount: discountValue,
        lines: included.map((line) => ({
          municipalFeeId: line.feeId,
          amount: parseGroupedAmount(line.amount) ?? 0,
          included: true,
        })),
      })
      void queryClient.invalidateQueries({ queryKey: ['payment-history'] })

      if (method === 'ONLINE' && onlineChannel === 'OPERATOR') {
        const { data: redirect } = await api.post<GatewayRedirect>(`/payments/${payment.id}/gateway`)
        redirecting = true
        toast.info(t('payments.redirectingToGateway'))
        submitToGateway(redirect)
        return
      }

      if (method === 'ONLINE') {
        if (payment.payLink) {
          setCreatedLink({ id: payment.id, receiptNumber: payment.receiptNumber, url: payment.payLink.url })
        }
        toast.success(t('payments.linkCreated'))
        if (payment.sms && !payment.sms.sent) {
          toast.warning(t(payment.sms.reason === 'NO_PHONE' ? 'payments.linkNeedsPhone' : 'payments.smsUnavailable'))
        }
      } else {
        if (method === 'BANK_RECEIPT' && receiptFile) {
          try {
            const body = new FormData()
            body.append('file', await optimizeImageFile(receiptFile))
            await api.post(`/payment-history/${payment.id}/receipts`, body)
          } catch (error) {
            toast.error(getApiErrorMessage(error, t('payments.receiptUploadFailed')))
          }
        }
        toast.success(t('payments.paid'))
      }
      if (prefill) {
        void queryClient.invalidateQueries({ queryKey: ['case-finance'] })
        if (method !== 'ONLINE') prefill.onDone()
      } else {
        resetForm()
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      if (!redirecting) setSubmitting(false)
    }
  }

  function resetForm() {
    setParty(null)
    setResetKey((current) => current + 1)
    setDescription('')
    setGroupId(ALL_PAYMENT_GROUPS)
    setAccountId(onlyAccountId)
    setLines([])
    setDiscountMode('manual')
    setDiscountId('')
    setDiscountAmount('')
    setDiscountTouched(false)
    setCaseRequestId('')
    setMethod('')
    setOnlineChannel('OPERATOR')
    setTrackingCode('')
    setReceiptFile(null)
    setReceiptKey((current) => current + 1)
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('common.copied'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const submitLabel =
    method === 'ONLINE'
      ? onlineChannel === 'OPERATOR'
        ? t('payments.goToGateway')
        : t('payments.createLink')
      : t('payments.pay')
  const SubmitIcon = method === 'ONLINE' ? (onlineChannel === 'OPERATOR' ? Globe : Send) : Banknote

  const showFees = Boolean(groupId) && (groupId !== ALL_PAYMENT_GROUPS || Boolean(accountId))

  return (
    <div className={prefill ? undefined : formShellClassName}>
      {prefill ? null : (
        <PageHeader
          icon={Banknote}
          title={t('menus.payments')}
          subtitle={t('payments.subtitle')}
          action={
            <Button type="button" variant="soft" onClick={() => setGroupsOpen(true)}>
              <Layers className="size-4" aria-hidden />
              {t('payments.groups.manage')}
            </Button>
          }
        />
      )}
      {createdLink ? (
        <div className="mb-4 rounded-3xl border border-teal-200 bg-teal-50 p-4 shadow-[0_8px_20px_rgba(46,189,182,0.12)]">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white">
              <Link2 className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-ink-900">
                {t('payments.linkReady', { value: localizeDigits(createdLink.receiptNumber, locale) })}
              </p>
              <p className="truncate rounded-xl bg-white px-3 py-2 text-xs text-ink-700" dir="ltr">
                {createdLink.url}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => void copyLink(createdLink.url)}>
                  <Copy className="size-4" aria-hidden />
                  {t('payments.copyLink')}
                </Button>
                <Link to={`/finance/payment-history/${createdLink.id}`}>
                  <Button type="button" variant="ghost">
                    <Eye className="size-4" aria-hidden />
                    {t('payments.viewPayment')}
                  </Button>
                </Link>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              icon
              aria-label={t('common.close')}
              title={t('common.close')}
              onClick={() => setCreatedLink(null)}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
      <FormCard
        icon={Banknote}
        title={prefill ? t('caseFinance.recordPayment') : t('menus.payments')}
        action={
          prefill ? (
            <Button
              type="button"
              variant="ghost"
              icon
              aria-label={t('common.close')}
              title={t('common.close')}
              onClick={prefill.onClose}
            >
              <X className="size-4" aria-hidden />
            </Button>
          ) : undefined
        }
      >
        <AppForm autoFocusFirst={!prefill} onSubmit={() => void submit()} className={formCardBodyClassName}>
          {prefill ? (
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              <FormFactTile icon={UserRound} label={t('payments.payer')} value={prefill.party.party.fullName} />
              <FormFactTile
                icon={ClipboardList}
                tone="mint"
                label={t('payments.caseRequest')}
                value={`${localizeDigits(prefill.request.number, locale)} — ${t(`cases.requestTypes.${prefill.request.type}`)}`}
              />
              <FormFactTile
                icon={Landmark}
                label={t('payments.bankAccount')}
                value={bankAccountOptionLabel(prefill.bankAccount, locale, t('geo.inactive'))}
              />
            </div>
          ) : (
            <PaymentPartySearch
              resetKey={resetKey}
              value={party}
              onChange={(next) => {
                setParty(next)
                setCaseRequestId('')
              }}
            />
          )}

          {!prefill && party?.caseFileId && caseRequests.length > 0 ? (
            <FormField icon={ClipboardList} label={t('payments.caseRequest')} htmlFor="payment-case-request">
              <SearchSelect
                id="payment-case-request"
                value={caseRequestId}
                placeholder={t('payments.noCaseRequest')}
                onChange={setCaseRequestId}
                options={[
                  { value: '', label: t('payments.noCaseRequest') },
                  ...caseRequests.map((request) => ({
                    value: request.id,
                    label: `${localizeDigits(request.number, locale)} — ${t(`cases.requestTypes.${request.type}`)} (${t(`cases.requestStatus.${request.status}`)})`,
                  })),
                ]}
              />
            </FormField>
          ) : null}

          {prefill ? null : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField icon={Layers} label={t('payments.group')} htmlFor="payment-group">
              <SearchSelect
                id="payment-group"
                value={groupId}
                placeholder={t('payments.selectGroup')}
                onChange={chooseGroup}
                options={[
                  { value: ALL_PAYMENT_GROUPS, label: t('payments.allGroups') },
                  ...groups.map((group) => ({ value: group.id, label: group.title })),
                ]}
              />
            </FormField>
            <FormField icon={Landmark} label={t('payments.bankAccount')} htmlFor="payment-account">
              {selectedGroup ? (
                <SearchSelect
                  id="payment-account"
                  value={selectedGroup.bankAccountId}
                  disabled
                  onChange={() => undefined}
                  options={[
                    {
                      value: selectedGroup.bankAccountId,
                      label: bankAccountOptionLabel(selectedGroup.bankAccount, locale, t('geo.inactive')),
                    },
                  ]}
                />
              ) : (
                <SearchSelect
                  id="payment-account"
                  value={accountId}
                  placeholder={t('payments.selectBankAccount')}
                  onChange={setAccountId}
                  options={activeAccounts.map((account) => ({
                    value: account.id,
                    label: bankAccountOptionLabel(account, locale, t('geo.inactive')),
                  }))}
                />
              )}
            </FormField>
          </div>
          )}

          {!showFees ? <FormEmptyHint>{t('payments.pickSource')}</FormEmptyHint> : null}
          {showFees && lines.length === 0 && feesReady ? (
            <FormEmptyHint>{t('payments.noFees')}</FormEmptyHint>
          ) : null}
          {lines.length > 0 ? (
            <div className="space-y-4">
              <FormSectionTitle icon={Banknote} className="mb-2">
                {t('payments.fees')}
              </FormSectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="w-px px-4 py-3 text-start">
                        <CheckboxField
                          compact
                          label={t('payments.includeAll')}
                          checked={allIncluded}
                          indeterminate={someIncluded && !allIncluded}
                          onChange={(checked) =>
                            setLines((current) => current.map((line) => ({ ...line, included: checked })))
                          }
                        />
                      </th>
                      <th className="px-4 py-3 text-start">{t('payments.feeTitle')}</th>
                      <th className="w-56 px-4 py-3 text-start">{t('payments.feeAmount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.feeId} className="border-t border-line">
                        <td className="px-4 py-3">
                          <CheckboxField
                            compact
                            label={t('payments.include')}
                            checked={line.included}
                            onChange={(checked) =>
                              setLines((current) =>
                                current.map((item) =>
                                  item.feeId === line.feeId ? { ...item, included: checked } : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          {line.title}
                          {line.isActive ? '' : ` (${t('payments.inactiveFee')})`}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label={t('payments.feeAmount')}
                            inputMode="numeric"
                            autoComplete="off"
                            className={`${fieldClassName} digit-field`}
                            value={groupAmountInput(line.amount, locale)}
                            onChange={(event) => {
                              const next = groupAmountInput(event.target.value, locale)
                              setLines((current) =>
                                current.map((item) =>
                                  item.feeId === line.feeId ? { ...item, amount: next } : item,
                                ),
                              )
                            }}
                            onFocus={(event) => event.currentTarget.select()}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-cream-50 font-medium text-ink-800">
                      <td className="px-4 py-3" colSpan={2}>
                        {t('payments.feeCount')}
                        {': '}
                        {formatNumber(included.length, locale)}
                      </td>
                      <td className="px-4 py-3">
                        {t('payments.subtotal')}
                        {': '}
                        {formatGroupedNumber(subtotal, locale)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className={`grid gap-4 ${discountMode === 'catalog' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <FormField icon={Percent} label={t('payments.discountMode')} htmlFor="payment-discount-mode">
                  <SearchSelect
                    id="payment-discount-mode"
                    value={discountMode}
                    onChange={(next) => {
                      const mode = next === 'catalog' ? 'catalog' : 'manual'
                      setDiscountMode(mode)
                      setDiscountTouched(false)
                      if (mode === 'manual') setDiscountId('')
                    }}
                    options={[
                      { value: 'manual', label: t('payments.discountManual') },
                      { value: 'catalog', label: t('payments.discountCatalog') },
                    ]}
                  />
                </FormField>
                {discountMode === 'catalog' ? (
                  <FormField icon={Percent} label={t('payments.discount')} htmlFor="payment-discount">
                    <SearchSelect
                      id="payment-discount"
                      value={discountId}
                      placeholder={t('payments.selectDiscount')}
                      onChange={(next) => {
                        setDiscountId(next)
                        setDiscountTouched(false)
                      }}
                      options={(discountsQuery.data ?? []).map((discount) => ({
                        value: discount.id,
                        label: `${discount.title} — ${formatNumber(discount.year, locale)} — ${t('discounts.percentValue', { value: formatNumber(discount.percent, locale) })}`,
                      }))}
                    />
                  </FormField>
                ) : null}
                <FormField icon={Banknote} label={t('payments.discountAmount')} htmlFor="payment-discount-amount">
                  <AmountInput
                    id="payment-discount-amount"
                    value={discountAmount}
                    onChange={(next) => {
                      setDiscountTouched(true)
                      setDiscountAmount(next)
                    }}
                  />
                </FormField>
              </div>
              {discountValue > subtotal ? (
                <p className="text-sm text-red-600">{t('payments.discountTooHigh')}</p>
              ) : null}

              <FormSectionTitle icon={Wallet} className="mb-2">
                {t('payments.method')}
              </FormSectionTitle>
              <div role="radiogroup" aria-label={t('payments.method')} className="grid gap-2 sm:grid-cols-3">
                {(['POS', 'BANK_RECEIPT', 'ONLINE'] as const).map((item) => (
                  <ChoiceTile
                    key={item}
                    selected={method === item}
                    icon={paymentMethodIcons[item]}
                    title={t(`payments.methods.${item}`)}
                    hint={t(`payments.methodHints.${item}`)}
                    onSelect={() => setMethod(item)}
                  />
                ))}
              </div>

              {trackingVisible ? (
                <FormField
                  icon={Hash}
                  label={t(method === 'POS' ? 'payments.posTrackingCode' : 'payments.receiptTrackingCode')}
                  htmlFor="payment-tracking-code"
                >
                  <input
                    id="payment-tracking-code"
                    aria-required
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={40}
                    className={`${fieldClassName} digit-field`}
                    placeholder={t('payments.trackingCodePlaceholder')}
                    value={trackingCode}
                    onChange={(event) => setTrackingCode(event.target.value)}
                  />
                </FormField>
              ) : null}

              {method === 'BANK_RECEIPT' ? (
                <FormField icon={ImagePlus} label={t('payments.receiptImage')} htmlFor="payment-receipt-image">
                  <FileDropField
                    key={receiptKey}
                    id="payment-receipt-image"
                    accept="image/*"
                    capture="environment"
                    onFile={setReceiptFile}
                    onClear={() => setReceiptFile(null)}
                  />
                </FormField>
              ) : null}

              {method === 'ONLINE' ? (
                <div className="space-y-2">
                  <div role="radiogroup" aria-label={t('payments.onlineChannel')} className="grid gap-2 sm:grid-cols-2">
                    <ChoiceTile
                      selected={onlineChannel === 'OPERATOR'}
                      icon={MonitorSmartphone}
                      title={t('payments.onlineChannels.OPERATOR')}
                      hint={t('payments.onlineChannelHints.OPERATOR')}
                      onSelect={() => setOnlineChannel('OPERATOR')}
                    />
                    <ChoiceTile
                      selected={onlineChannel === 'PUBLIC_LINK'}
                      icon={MessageSquareText}
                      title={t('payments.onlineChannels.PUBLIC_LINK')}
                      hint={
                        payerPhone ? (
                          <span dir="ltr">{localizeDigits(payerPhone, locale)}</span>
                        ) : (
                          t('payments.onlineChannelHints.PUBLIC_LINK')
                        )
                      }
                      onSelect={() => setOnlineChannel('PUBLIC_LINK')}
                    />
                  </div>
                  {onlineChannel === 'PUBLIC_LINK' && party && !payerPhone ? (
                    <p className="text-sm text-red-600">{t('payments.linkNeedsPhone')}</p>
                  ) : null}
                  {finalAmount > 0 && finalAmount < MIN_ONLINE_AMOUNT ? (
                    <p className="text-sm text-red-600">{t('payments.onlineMinAmount')}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <AmountStat
                  icon={Banknote}
                  label={t('payments.totalAmount')}
                  value={formatGroupedNumber(subtotal, locale)}
                />
                <AmountStat
                  icon={Percent}
                  label={t('payments.discountAmount')}
                  value={formatGroupedNumber(discountValue, locale)}
                />
                <AmountStat
                  icon={Wallet}
                  label={t('payments.finalPayable')}
                  value={formatGroupedNumber(Math.max(finalAmount, 0), locale)}
                  hint={
                    finalWords && finalAmount >= 0
                      ? t('common.amountEquivalent', { value: finalWords })
                      : undefined
                  }
                  highlight
                />
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <FormField icon={FileText} label={t('payments.description')} htmlFor="payment-description">
                    <textarea
                      id="payment-description"
                      rows={2}
                      className={fieldClassName}
                      placeholder={t('payments.descriptionPlaceholder')}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </FormField>
                </div>
                <Button
                  id="payment-submit"
                  type="submit"
                  className="min-w-48 shrink-0"
                  disabled={submitting || discountValue > subtotal}
                >
                  <SubmitIcon className="size-4" aria-hidden />
                  {submitting ? t('payments.paying') : submitLabel}
                </Button>
              </div>
            </div>
          ) : null}
        </AppForm>
      </FormCard>
      {groupsOpen ? <PaymentGroupsModal onClose={() => setGroupsOpen(false)} /> : null}
    </div>
  )
}
