import { BadgePercent, CalendarDays, Gavel, Heading, Package, Percent, Plus, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AmountInput } from '../../components/ui/AmountInput'
import {
  AppForm,
  Button,
  FormActions,
  FormField,
  PageHeader,
  caseShellClassName,
  fieldClassName,
} from '../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, formatNumber, localizeDigits, parseGroupedAmount, toLatinDigits } from '../../lib/datetime'
import { AuctionCaseSubtitle, AuctionStepRing, AuctionWizardNav } from './AuctionWizard'
import {
  AUCTION_WIZARD_STEPS,
  auctionWizardFinished,
  auctionWizardReached,
  priceAfterDiscount,
  type AuctionRequest,
} from './auction'

type ItemDraft = {
  key: string
  name: string
  price: string
  discountPercent: string
}

function emptyItem(): ItemDraft {
  return { key: crypto.randomUUID(), name: '', price: '', discountPercent: '' }
}

function parsePercent(raw: string) {
  const normalized = toLatinDigits(raw).trim().replace(/,/g, '.').replace(/٬/g, '')
  if (!normalized) return null
  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

type AuctionCaseHeader = {
  businessUnitTitle: string | null
  licenseNumber: string | null
  job: { title: string } | null
  person: { fullName: string; firstName: string; lastName: string } | null
}

function hundredths(value: number) {
  return Math.round(value * 100)
}

function AuctionFormShell({
  bare,
  isEdit,
  children,
}: {
  bare: boolean
  isEdit: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  if (bare) return children
  return (
    <FormCard
      icon={Gavel}
      title={t('cases.auction.wizardSteps.request')}
      subtitle={isEdit ? undefined : t('cases.auction.createSubtitle')}
    >
      {children}
    </FormCard>
  )
}

function itemNameKey(name: string) {
  return name
    .trim()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function CaseAuctionFormPage() {
  return <AuctionRequestForm />
}

export function AuctionRequestForm({
  caseId: caseIdProp,
  requestId: requestIdProp,
  bare = false,
  onSaved,
}: {
  caseId?: string
  requestId?: string
  bare?: boolean
  onSaved?: () => void
} = {}) {
  const params = useParams()
  const id = caseIdProp ?? params.id ?? ''
  const requestId = requestIdProp ?? params.requestId
  const isEdit = Boolean(requestId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const redirected = useRef(false)
  const defaultTitle = t('cases.auction.title')
  const [title, setTitle] = useState(defaultTitle)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [discountMin, setDiscountMin] = useState('')
  const [discountMax, setDiscountMax] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(!isEdit)
  const caseFile = useQuery({
    queryKey: ['cases', 'home', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<AuctionCaseHeader>(`/cases/${id}`)).data,
  })
  const loaded = useQuery({
    queryKey: ['cases', 'auction', id, requestId],
    enabled: isEdit,
    queryFn: async () => (await api.get<AuctionRequest>(`/cases/${id}/auction/${requestId}`)).data,
  })

  useEffect(() => {
    const data = loaded.data
    if (!data) return
    setTitle(data.title?.trim() || defaultTitle)
    setStartsAt(data.startsAt)
    setEndsAt(data.endsAt)
    setDiscountMin(String(data.discountMin))
    setDiscountMax(String(data.discountMax))
    setItems(
      data.items.map((item) => ({
        key: item.id,
        name: item.name,
        price: String(item.price),
        discountPercent: String(item.discountPercent),
      })),
    )
    setReady(true)
  }, [defaultTitle, loaded.data])

  useEffect(() => {
    if (bare || !loaded.isError || redirected.current) return
    redirected.current = true
    toast.error(getApiErrorMessage(loaded.error, t('common.error')))
    navigate(`/cases/${id}?stay=1`, { replace: true })
  }, [bare, id, loaded.error, loaded.isError, navigate, t])

  useEffect(() => {
    if (bare || !loaded.data || loaded.data.editable || redirected.current) return
    redirected.current = true
    const issued = loaded.data.status === 'ISSUED' || loaded.data.status === 'COMPLETED'
    toast.error(t(issued ? 'cases.auction.issuedLocked' : 'cases.auction.locked'))
    navigate(`/cases/${id}/auction/${requestId}`, { replace: true })
  }, [bare, id, loaded.data, navigate, requestId, t])

  const person = caseFile.data?.person
  const backTo = `/cases/${id}?stay=1`
  const reached = auctionWizardReached(loaded.data)
  const finished = auctionWizardFinished(loaded.data)
  const stepCurrent = Math.min(reached + 1, AUCTION_WIZARD_STEPS.length)
  const stepTotal = AUCTION_WIZARD_STEPS.length

  function openWizardStep(index: number) {
    if (!requestId || index > reached) return
    if (index === 0) return
    navigate(`/cases/${id}/auction/${requestId}?step=${AUCTION_WIZARD_STEPS[index]}`)
  }

  function patchItem(key: string, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function discountBounds() {
    const min = parsePercent(discountMin)
    const max = parsePercent(discountMax)
    if (min == null || max == null || hundredths(max) < hundredths(min)) return null
    return { min, max }
  }

  function discountViolation(raw: string) {
    const percent = parsePercent(raw)
    const range = discountBounds()
    if (percent == null || !range) return null
    if (hundredths(percent) < hundredths(range.min)) return 'low' as const
    if (hundredths(percent) > hundredths(range.max)) return 'high' as const
    return null
  }

  function duplicateItemName(key: string, raw: string) {
    const name = itemNameKey(raw)
    if (!name) return false
    return items.some((row) => row.key !== key && itemNameKey(row.name) === name)
  }

  function focusItemField(id: string) {
    window.setTimeout(() => {
      const input = document.getElementById(id)
      if (!(input instanceof HTMLInputElement)) return
      input.focus()
      input.select()
    }, 0)
  }

  function warnDuplicateName(key: string) {
    toast.error(t('cases.auction.itemNameDuplicate'), { id: 'auction-item-name-duplicate' })
    focusItemField(`auctionItemName-${key}`)
    return true
  }

  function warnItemDiscount(key: string) {
    const range = discountBounds()
    if (!range) return false
    toast.error(
      t('cases.auction.itemDiscountRange', {
        min: localizeDigits(String(range.min), locale),
        max: localizeDigits(String(range.max), locale),
      }),
      { id: 'auction-item-discount-range' },
    )
    focusItemField(`auctionItemDiscount-${key}`)
    return true
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const min = parsePercent(discountMin)
    const max = parsePercent(discountMax)
    if (!startsAt || !endsAt || min == null || max == null) {
      toast.error(t('cases.auction.required'))
      return
    }
    if (endsAt < startsAt) {
      toast.error(t('cases.auction.dateOrder'))
      return
    }
    if (hundredths(max) < hundredths(min)) {
      toast.error(t('cases.auction.discountOrder'))
      return
    }
    const payloadItems = []
    const names = new Set<string>()
    for (const item of items) {
      const price = parseGroupedAmount(item.price)
      const discountPercent = parsePercent(item.discountPercent)
      const nameKey = itemNameKey(item.name)
      if (nameKey && names.has(nameKey)) {
        warnDuplicateName(item.key)
        return
      }
      if (nameKey) names.add(nameKey)
      if (!item.name.trim() || price == null || price < 1 || discountPercent == null) {
        toast.error(t('cases.auction.required'))
        return
      }
      if (hundredths(discountPercent) < hundredths(min) || hundredths(discountPercent) > hundredths(max)) {
        warnItemDiscount(item.key)
        return
      }
      payloadItems.push({ name: item.name.trim(), price, discountPercent })
    }
    setSaving(true)
    try {
      const body = { title: title.trim() || null, startsAt, endsAt, discountMin: min, discountMax: max, items: payloadItems }
      const saved = isEdit
        ? (await api.patch<AuctionRequest>(`/cases/${id}/auction/${requestId}`, body)).data
        : (await api.post<AuctionRequest>(`/cases/${id}/auction`, body)).data
      toast.success(t(isEdit ? 'cases.auction.updated' : 'cases.auction.saved'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'auction', id, saved.id] })
      await queryClient.invalidateQueries({ queryKey: ['cases', 'home', id] })
      if (onSaved) {
        onSaved()
        return
      }
      const issued = saved.status === 'ISSUED' || saved.status === 'COMPLETED'
      navigate(
        issued
          ? `/cases/${id}/auction/${saved.id}?step=issue`
          : `/cases/${id}/auction/${saved.id}?step=management`,
      )
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={bare ? undefined : caseShellClassName}>
      {bare ? null : (
      <PageHeader
        icon={Gavel}
        title={t('cases.auction.wizardTitle')}
        titleExtra={
          ready ? (
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
      )}
      {bare ? null : ready ? <AuctionWizardNav view={0} reached={reached} finished={finished} onStep={openWizardStep} /> : null}
      {isEdit && loaded.isLoading ? <LoadingState /> : null}
      {ready && (!isEdit || loaded.data?.editable) ? (
        <AuctionFormShell bare={bare} isEdit={isEdit}>
          <AppForm onSubmit={submit} className={formCardBodyClassName}>
            <FormField icon={Heading} label={t('cases.auction.licenseTitle')} htmlFor="auctionTitle">
              <input
                id="auctionTitle"
                className={fieldClassName}
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField icon={CalendarDays} label={t('cases.auction.startsAt')} htmlFor="auctionStartsAt">
                <PersianDateField id="auctionStartsAt" value={startsAt} onChange={(value) => setStartsAt(value ?? '')} maxDate={endsAt || undefined} />
                <input className="sr-only" tabIndex={-1} value={startsAt} required onChange={() => undefined} />
              </FormField>
              <FormField icon={CalendarDays} label={t('cases.auction.endsAt')} htmlFor="auctionEndsAt">
                <PersianDateField id="auctionEndsAt" value={endsAt} onChange={(value) => setEndsAt(value ?? '')} minDate={startsAt || undefined} />
                <input className="sr-only" tabIndex={-1} value={endsAt} required onChange={() => undefined} />
              </FormField>
              <FormField icon={Percent} label={t('cases.auction.discountFrom')} htmlFor="auctionDiscountMin">
                <input
                  id="auctionDiscountMin"
                  inputMode="decimal"
                  autoComplete="off"
                  className={`${fieldClassName} digit-field`}
                  value={discountMin}
                  onChange={(event) => setDiscountMin(event.target.value)}
                  required
                />
              </FormField>
              <FormField icon={Percent} label={t('cases.auction.discountTo')} htmlFor="auctionDiscountMax">
                <input
                  id="auctionDiscountMax"
                  inputMode="decimal"
                  autoComplete="off"
                  className={`${fieldClassName} digit-field`}
                  value={discountMax}
                  onChange={(event) => setDiscountMax(event.target.value)}
                  required
                />
              </FormField>
            </div>
            <FormSectionTitle icon={Package}>{t('cases.auction.items')}</FormSectionTitle>
            <div className="space-y-3">
              {items.map((item) => {
                const price = parseGroupedAmount(item.price)
                const percent = parsePercent(item.discountPercent)
                const after = price != null && percent != null ? priceAfterDiscount(price, percent) : null
                return (
                  <div key={item.key} className="space-y-3 rounded-2xl border border-teal-100 bg-cream-50/40 p-3">
                    <div className="grid gap-3 lg:grid-cols-4">
                      <FormField icon={Package} label={t('cases.auction.itemName')} htmlFor={`auctionItemName-${item.key}`}>
                        <input
                          id={`auctionItemName-${item.key}`}
                          className={fieldClassName}
                          value={item.name}
                          maxLength={200}
                          required
                          onChange={(event) => {
                            const value = event.target.value
                            patchItem(item.key, { name: value })
                            if (duplicateItemName(item.key, value)) warnDuplicateName(item.key)
                          }}
                          onBlur={(event) => {
                            const next = event.relatedTarget
                            if (next instanceof HTMLElement && next.closest('[data-form-cancel]')) return
                            if (duplicateItemName(item.key, event.currentTarget.value)) warnDuplicateName(item.key)
                          }}
                        />
                      </FormField>
                      <FormField icon={BadgePercent} label={t('cases.auction.itemPrice')} htmlFor={`auctionItemPrice-${item.key}`}>
                        <AmountInput
                          id={`auctionItemPrice-${item.key}`}
                          value={item.price}
                          required
                          onChange={(value) => patchItem(item.key, { price: value })}
                        />
                      </FormField>
                      <FormField icon={Percent} label={t('cases.auction.itemDiscount')} htmlFor={`auctionItemDiscount-${item.key}`}>
                        <input
                          id={`auctionItemDiscount-${item.key}`}
                          inputMode="decimal"
                          autoComplete="off"
                          className={`${fieldClassName} digit-field`}
                          value={item.discountPercent}
                          required
                          onChange={(event) => {
                            const value = event.target.value
                            patchItem(item.key, { discountPercent: value })
                            if (discountViolation(value) === 'high') warnItemDiscount(item.key)
                          }}
                          onBlur={(event) => {
                            const next = event.relatedTarget
                            if (next instanceof HTMLElement && next.closest('[data-form-cancel]')) return
                            if (discountViolation(event.currentTarget.value)) warnItemDiscount(item.key)
                          }}
                        />
                      </FormField>
                      <FormField icon={BadgePercent} label={t('cases.auction.itemPriceAfter')}>
                        <p className={`${fieldClassName} digit-field`} dir="ltr">
                          {after == null ? '—' : formatGroupedNumber(after, locale)}
                        </p>
                      </FormField>
                    </div>
                    {items.length > 1 ? (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={t('cases.auction.removeItem')}
                          onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}
                        >
                          <Trash2 className="size-4" aria-hidden />
                          {t('cases.auction.removeItem')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <Button type="button" variant="ghost" onClick={() => setItems((current) => [...current, emptyItem()])}>
              <Plus className="size-4" aria-hidden />
              {t('cases.auction.addItem')}
            </Button>
            <FormActions
              headerIcons={bare ? false : undefined}
              submitLabel={t('common.save')}
              cancelLabel={t('common.cancel')}
              submitting={saving}
              onCancel={() => {
                const data = loaded.data
                if (bare && data) {
                  setTitle(data.title?.trim() || defaultTitle)
                  setStartsAt(data.startsAt)
                  setEndsAt(data.endsAt)
                  setDiscountMin(String(data.discountMin))
                  setDiscountMax(String(data.discountMax))
                  setItems(
                    data.items.map((item) => ({
                      key: item.id,
                      name: item.name,
                      price: String(item.price),
                      discountPercent: String(item.discountPercent),
                    })),
                  )
                  return
                }
                navigate(backTo)
              }}
              cancelEnd
            />
          </AppForm>
        </AuctionFormShell>
      ) : null}
    </div>
  )
}
