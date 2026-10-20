import { BadgeCheck, CalendarDays, Check, Gavel, Heading, Package, Percent } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import { Button, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { confirmToast } from '../../components/ui/confirmToast'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, formatNumber, localizeDigits } from '../../lib/datetime'
import { AuctionCaseSubtitle, AuctionStepRing, AuctionWizardNav, auctionIssueButtonLabel } from './AuctionWizard'
import { AuctionRequestForm } from './CaseAuctionFormPage'
import { CaseManagementReviewStep, type CaseManagementApproverRow } from './CaseManagementReviewStep'
import { useCaseCapabilities } from './case-capabilities'
import {
  AUCTION_WIZARD_STEPS,
  auctionWizardFinished,
  auctionWizardReached,
  type AuctionRequest,
  type AuctionWizardStep,
} from './auction'

function percentText(value: number, locale: string) {
  const rounded = Math.round(value * 100) / 100
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded)
  return `${localizeDigits(text, locale)}٪`
}

type AuctionCaseHeader = {
  businessUnitTitle: string | null
  licenseNumber: string | null
  job: { title: string } | null
  person: { fullName: string; firstName: string; lastName: string } | null
}

function managementApproved(rows: CaseManagementApproverRow[] | undefined) {
  return Boolean(rows && rows.length > 0 && rows.every((row) => row.status === 'APPROVED'))
}

function wizardStepIndex(value: string | null) {
  const name = value === 'approvals' || value === 'places' ? 'management' : value
  const index = AUCTION_WIZARD_STEPS.indexOf(name as AuctionWizardStep)
  return index >= 0 ? index : null
}

export function CaseAuctionDetailPage() {
  const { id = '', requestId = '' } = useParams()
  const { admin, placesViewer, managementReviewer, issuerViewer, canIssue, managementRoleIds } = useCaseCapabilities()
  const [approvingIntake, setApprovingIntake] = useState(false)
  const visitor = placesViewer || managementReviewer || issuerViewer
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const redirected = useRef(false)
  const keepManagement = useRef(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const caseFile = useQuery({
    queryKey: ['cases', 'home', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<AuctionCaseHeader>(`/cases/${id}`)).data,
  })
  const query = useQuery({
    queryKey: ['cases', 'auction', id, requestId],
    enabled: Boolean(id && requestId),
    queryFn: async () => (await api.get<AuctionRequest>(`/cases/${id}/auction/${requestId}`)).data,
  })
  const reviews = useQuery({
    queryKey: ['cases', 'formation-management-approvers', id, requestId],
    enabled: Boolean(id && requestId) && (query.data?.phase ?? 0) >= 1,
    queryFn: async () =>
      (
        await api.get<CaseManagementApproverRow[]>('/cases/formation/management-approvers', {
          params: { caseId: id, requestId },
        })
      ).data,
  })

  useEffect(() => {
    if (!query.isError || redirected.current) return
    redirected.current = true
    toast.error(getApiErrorMessage(query.error, t('common.error')))
    navigate(`/cases/${id}?stay=1`, { replace: true })
  }, [id, navigate, query.error, query.isError, t])

  const item = query.data
  const person = caseFile.data?.person
  const personName = [person?.firstName, person?.lastName].filter(Boolean).join(' ') || person?.fullName || ''
  const approvalsComplete = managementApproved(reviews.data)
  const backTo = placesViewer
    ? '/cases/places'
    : managementReviewer
      ? '/cases/management-reviews'
      : issuerViewer
        ? '/cases/issuance'
        : `/cases/${id}?stay=1`
  const reached = Math.max(
    auctionWizardReached(item),
    approvalsComplete && item && item.status !== 'REJECTED' && item.status !== 'CANCELLED' ? 2 : 0,
  )
  const finished = auctionWizardFinished(item)
  const requestedStep = wizardStepIndex(params.get('step'))
  const step = Math.min(requestedStep ?? reached, reached)
  const stepCurrent = Math.min(reached + 1, AUCTION_WIZARD_STEPS.length)
  const stepTotal = AUCTION_WIZARD_STEPS.length
  const showIssue = Boolean(canIssue && item && item.status === 'OPEN' && (item.canIssue || approvalsComplete))
  const draftEditable = Boolean(
    item && item.status === 'OPEN' && item.approvals.every((row) => row.status === 'PENDING'),
  )
  const showPrivilegedEdit = Boolean(!visitor && item?.editable && !draftEditable && !item.awaitingIntake)
  const awaitingIntake = Boolean(item?.awaitingIntake)

  useEffect(() => {
    if (visitor || !item?.editable || showPrivilegedEdit || item.awaitingIntake || step !== 0) return
    navigate(`/cases/${id}/auction/${requestId}/edit`, { replace: true })
  }, [id, item?.awaitingIntake, item?.editable, navigate, visitor, requestId, showPrivilegedEdit, step])

  useEffect(() => {
    if (!canIssue || reviews.isLoading) return
    if (!approvalsComplete) {
      keepManagement.current = false
      return
    }
    if (step !== 1 || keepManagement.current) return
    setParams({ step: 'issue' }, { replace: true })
  }, [approvalsComplete, canIssue, reviews.isLoading, setParams, step])

  function openStep(index: number) {
    keepManagement.current = index === 1 && approvalsComplete
    if (index > reached) return
    if (!visitor && index === 0 && item?.editable && !showPrivilegedEdit && !item.awaitingIntake) {
      navigate(`/cases/${id}/auction/${requestId}/edit`)
      return
    }
    const name = AUCTION_WIZARD_STEPS[index]
    if (!name) return
    setParams({ step: name }, { replace: true })
  }

  function refreshAuction() {
    void queryClient.invalidateQueries({ queryKey: ['cases', 'auction', id, requestId] })
    void queryClient.invalidateQueries({ queryKey: ['cases', 'home', id] })
  }

  async function approveIntake() {
    if (!admin || !id || approvingIntake) return
    setApprovingIntake(true)
    try {
      await api.post('/cases/formation/approve-intake', { caseId: id, step: 1 })
      toast.success(t('cases.intakeApproved'))
      refreshAuction()
      void queryClient.invalidateQueries({ queryKey: ['cases', 'formation-management-approvers', id, requestId] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setApprovingIntake(false)
    }
  }

  async function issue() {
    setSavingId('issue')
    try {
      await api.post(`/cases/${id}/auction/${requestId}/issue`)
      toast.success(t('cases.auction.issueDone'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'auction', id, requestId] })
      await queryClient.invalidateQueries({ queryKey: ['cases', 'home', id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSavingId(null)
    }
  }

  function askIssue() {
    confirmToast({
      title: t('cases.auction.issueConfirm'),
      confirmLabel: t('cases.auction.issueLicense'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => void issue(),
    })
  }

  const summary = item ? (
    <>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <FormFactTile className="sm:col-span-2" icon={Heading} label={t('cases.auction.licenseTitle')} value={item.title?.trim() || t('cases.auction.title')} />
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
    </>
  ) : null

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Gavel}
        title={finished ? t('cases.auction.title') : t('cases.auction.wizardTitle')}
        titleExtra={
          item ? (
            <AuctionStepRing
              currentLabel={formatNumber(stepCurrent, locale)}
              totalLabel={formatNumber(stepTotal, locale)}
              ratio={stepCurrent / stepTotal}
              label={t('cases.stepOf', {
                current: formatNumber(stepCurrent, locale),
                total: formatNumber(stepTotal, locale),
              })}
            />
          ) : undefined
        }
        subtitle={
          caseFile.data ? (
            <AuctionCaseSubtitle
              firstName={person?.firstName}
              lastName={person?.lastName}
              fullName={person?.fullName}
              jobTitle={caseFile.data.job?.title}
              businessUnitTitle={caseFile.data.businessUnitTitle}
              licenseNumber={caseFile.data.licenseNumber}
            />
          ) : undefined
        }
        backTo={backTo}
      />
      {item ? <AuctionWizardNav view={step} reached={reached} finished={finished} onStep={openStep} /> : null}
      {awaitingIntake ? (
        <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm leading-7 text-ink-700">{t('cases.awaitingRequestIntakeHint')}</p>
          {admin ? (
            <Button type="button" onClick={() => void approveIntake()} disabled={approvingIntake}>
              <Check className="size-4" aria-hidden />
              {t('cases.auction.approveIntake')}
            </Button>
          ) : null}
        </section>
      ) : null}
      {query.isLoading ? <LoadingState /> : null}
      {item && step === 0 ? (
        <FormCard icon={Gavel} title={t('cases.auction.wizardSteps.request')}>
          {showPrivilegedEdit ? (
            <AuctionRequestForm caseId={id} requestId={requestId} bare onSaved={refreshAuction} />
          ) : (
            <div className={formCardBodyClassName}>{summary}</div>
          )}
        </FormCard>
      ) : null}
      {item && step === 1 ? (
        <CaseManagementReviewStep
          caseId={id}
          items={reviews.data ?? []}
          loading={reviews.isLoading}
          autoAdvance={false}
          showAdvance={false}
          locked={false}
          ownRoleIds={managementRoleIds}
          onAdvanced={() => undefined}
          onRewound={refreshAuction}
          onChanged={refreshAuction}
        />
      ) : null}
      {item && step === 2 ? (
        <FormCard icon={BadgeCheck} title={finished ? t('cases.auction.title') : t('cases.auction.wizardSteps.issue')}>
          <div className={showPrivilegedEdit ? undefined : formCardBodyClassName}>
            {showPrivilegedEdit ? (
              <AuctionRequestForm caseId={id} requestId={requestId} bare onSaved={refreshAuction} />
            ) : (
              summary
            )}
            {showIssue ? (
              <div className={`flex justify-center ${showPrivilegedEdit ? 'px-5 pb-2 sm:px-6' : ''}`}>
                <Button type="button" disabled={savingId === 'issue'} onClick={askIssue}>
                  <BadgeCheck className="size-4" aria-hidden />
                  {auctionIssueButtonLabel(t, locale, personName, item.items.length)}
                </Button>
              </div>
            ) : null}
            {finished ? (
              <p className={`text-sm font-medium text-teal-800 ${showPrivilegedEdit ? 'px-5 pb-5 sm:px-6' : ''}`}>
                {t('cases.auction.issued')}
              </p>
            ) : null}
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}
