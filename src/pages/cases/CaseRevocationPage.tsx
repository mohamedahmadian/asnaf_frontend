import {
  BadgeCheck,
  Ban,
  Banknote,
  Building2,
  CalendarDays,
  Download,
  FileText,
  History,
  Printer,
  Store,
  WalletCards,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AmountInput } from '../../components/ui/AmountInput'
import {
  AppForm,
  Button,
  EntityNameSubtitle,
  FormActions,
  FormField,
  PageHeader,
  caseShellClassName,
  fieldClassName,
} from '../../components/ui/Form'
import { confirmToast } from '../../components/ui/confirmToast'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { LoadingState } from '../../components/ui/LoadingState'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { DateText } from '../../components/ui/DateText'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, parseGroupedAmount, todayIsoDate } from '../../lib/datetime'
import {
  downloadInquiryLetter,
  inquiryLetterFilename,
  printInquiryLetter,
} from './inquiry-api'
import type { CaseInquiryLetter } from './inquiry-types'

type RevocationTab = 'organizations' | 'finance' | 'finalize'

type RevocationState = {
  id: string
  amount: number
  revocationDate: string | null
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  case: {
    id: string
    businessUnitTitle: string | null
    licenseNumber: string | null
    firstIssuedAt: string | null
    fullName: string
    nationalId: string | null
    jobTitle: string | null
  }
  letters: {
    id: string
    centerName: string
    letterNo: string | null
    issuedAt: string | null
  }[]
}

const tabIds: RevocationTab[] = ['organizations', 'finance', 'finalize']

export function CaseRevocationPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [tab, setTabState] = useState<RevocationTab>(
    tabIds.includes(requestedTab as RevocationTab) ? (requestedTab as RevocationTab) : 'organizations',
  )
  const [amount, setAmount] = useState('')
  const [revokedAt, setRevokedAt] = useState(todayIsoDate())
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [letterBusy, setLetterBusy] = useState<string | null>(null)
  const state = useQuery({
    queryKey: ['cases', 'revocation-process', id],
    queryFn: async () => (await api.get<RevocationState>(`/cases/${id}/revocation-process`)).data,
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!state.data) return
    setAmount(formatGroupedNumber(state.data.amount, locale))
    setRevokedAt(state.data.revocationDate ?? todayIsoDate())
  }, [state.data, locale])

  function setTab(next: RevocationTab) {
    setTabState(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'organizations') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  async function useLetter(letterId: string, action: 'print' | 'download') {
    setLetterBusy(`${letterId}:${action}`)
    try {
      const { data } = await api.get<CaseInquiryLetter>(
        `/cases/${id}/revocation-process/letters/${letterId}`,
      )
      const paper = data.letterhead.defaultPaper
      if (action === 'print') await printInquiryLetter(data, locale, paper)
      else await downloadInquiryLetter(inquiryLetterFilename(data.centerName), data, locale, paper)
      await queryClient.invalidateQueries({ queryKey: ['cases', 'revocation-process', id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.revocationLetterFailed')))
    } finally {
      setLetterBusy(null)
    }
  }

  async function saveAmount(event: FormEvent) {
    event.preventDefault()
    const parsed = parseGroupedAmount(amount)
    if (parsed == null) return
    setSaving(true)
    try {
      const { data } = await api.put<RevocationState>(
        `/cases/${id}/revocation-process/amount`,
        { amount: parsed },
      )
      queryClient.setQueryData(['cases', 'revocation-process', id], data)
      toast.success(t('cases.revocationAmountSaved'))
      setTab('finalize')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  function submitRevocation(event: FormEvent) {
    event.preventDefault()
    confirmToast({
      title: `${t('cases.revocationFinalConfirm')} ${t('cases.revocationFinalConfirmHint')}`,
      confirmLabel: t('cases.revokeConfirm'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        setSaving(true)
        try {
          await api.post(`/cases/${id}/revocation-process/complete`, {
            reason: reason.trim(),
            revokedAt,
          })
          toast.success(t('cases.revokeSaved'))
          await queryClient.invalidateQueries({ queryKey: ['cases', 'home', id] })
          navigate(`/cases/${id}?stay=1`)
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
        } finally {
          setSaving(false)
        }
      },
    })
  }

  if (state.isLoading) return <LoadingState />
  if (!state.data) return <FormEmptyHint>{t('common.error')}</FormEmptyHint>
  const item = state.data
  const titleName = item.case.businessUnitTitle || item.case.fullName

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Ban}
        title={t('cases.revocationPageTitle')}
        subtitle={<EntityNameSubtitle icon={Store} name={titleName} />}
        backTo={`/cases/${id}?stay=1`}
      />
      <FormCard icon={Ban} title={t('cases.revocationPageTitle')} subtitle={titleName}>
        <FormTabs
          value={tab}
          onChange={(next) => setTab(next as RevocationTab)}
          tabs={[
            { id: 'organizations', label: t('cases.revocationOrganizationsTab'), icon: Building2 },
            { id: 'finance', label: t('cases.revocationFinanceTab'), icon: WalletCards },
            { id: 'finalize', label: t('cases.revocationFinalizeTab'), icon: Ban },
          ]}
        />

        {tab === 'organizations' ? (
          <div className={formCardBodyClassName}>
            <FormSectionTitle icon={Building2}>{t('cases.revocationOrganizations')}</FormSectionTitle>
            {item.letters.length === 0 ? (
              <FormEmptyHint>{t('cases.revocationEmpty')}</FormEmptyHint>
            ) : (
              <div className="grid gap-3">
                {item.letters.map((letter) => (
                  <div
                    key={letter.id}
                    className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{letter.centerName}</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {letter.letterNo
                          ? t('cases.revocationLetterIssued', { number: letter.letterNo })
                          : t('cases.revocationLetterReady')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        disabled={letterBusy != null}
                        onClick={() => void useLetter(letter.id, 'print')}
                      >
                        <Printer className="size-4" aria-hidden />
                        {t('cases.revocationPrintLetter')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={letterBusy != null}
                        onClick={() => void useLetter(letter.id, 'download')}
                      >
                        <Download className="size-4" aria-hidden />
                        {t('cases.revocationDownloadLetter')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button type="button" variant="soft" onClick={() => setTab('finance')}>
                <WalletCards className="size-4" aria-hidden />
                {t('cases.revocationGoFinance')}
              </Button>
            </div>
          </div>
        ) : null}

        {tab === 'finance' ? (
          <AppForm onSubmit={saveAmount} className={formCardBodyClassName} autoFocusFirst={false}>
            <FormSectionTitle icon={WalletCards}>{t('cases.revocationFinanceTab')}</FormSectionTitle>
            <FormField icon={Banknote} label={t('cases.revocationCaseFee')} htmlFor="revocation-case-amount">
              <AmountInput id="revocation-case-amount" value={amount} onChange={setAmount} required />
              <p className="text-xs text-ink-500">{t('cases.revocationCaseFeeHint')}</p>
            </FormField>
            <FormActions
              headerIcons={false}
              submitting={saving}
              submitLabel={t('cases.revocationConfirmGoFinalize')}
              cancelLabel={t('common.cancel')}
              onCancel={() => navigate(`/cases/${id}?stay=1`)}
            />
          </AppForm>
        ) : null}

        {tab === 'finalize' ? (
          <AppForm onSubmit={submitRevocation} className={formCardBodyClassName} autoFocusFirst={false}>
            <FormSectionTitle icon={FileText}>{t('cases.revocationCaseInformation')}</FormSectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormFactTile
                icon={Store}
                label={t('cases.revocationBusinessUnit')}
                value={item.case.businessUnitTitle || '—'}
                tone="teal"
              />
              <FormFactTile
                icon={BadgeCheck}
                label={t('cases.revocationEconomicLicense')}
                value={item.case.licenseNumber || '—'}
                tone="mint"
              />
              <FormFactTile
                icon={History}
                label={t('cases.revocationActivityHistory')}
                value={
                  <span className="inline-flex flex-wrap items-center gap-1" dir="ltr">
                    <DateText value={item.case.firstIssuedAt} />
                    <span>—</span>
                    <DateText value={todayIsoDate()} />
                  </span>
                }
                tone="ink"
              />
              <FormFactTile
                icon={Banknote}
                label={t('cases.revocationCaseFee')}
                value={formatGroupedNumber(item.amount, locale)}
                tone="teal"
              />
            </div>
            <FormField icon={CalendarDays} label={t('cases.revokedAt')} htmlFor="case-revoked-at">
              <PersianDateField
                id="case-revoked-at"
                value={revokedAt}
                maxDate={todayIsoDate()}
                onChange={(value) => setRevokedAt(value ?? '')}
              />
              <input
                className="sr-only"
                tabIndex={-1}
                value={revokedAt}
                required
                onChange={() => undefined}
              />
            </FormField>
            <FormField icon={FileText} label={t('cases.revokeReason')} htmlFor="case-revoke-reason">
              <textarea
                id="case-revoke-reason"
                className={fieldClassName}
                rows={5}
                required
                maxLength={2000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormField>
            <FormActions
              headerIcons={false}
              submitVariant="danger"
              submitting={saving}
              submitLabel={t('cases.revokeConfirm')}
              cancelLabel={t('common.cancel')}
              onCancel={() => navigate(`/cases/${id}?stay=1`)}
            />
          </AppForm>
        ) : null}
      </FormCard>
    </div>
  )
}
