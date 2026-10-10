import { BadgePercent, CalendarDays, Gavel, Package, Percent, Plus, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
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
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, localizeDigits, parseGroupedAmount, toLatinDigits } from '../../lib/datetime'
import { priceAfterDiscount, type AuctionRequest } from './auction'

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

function hundredths(value: number) {
  return Math.round(value * 100)
}

export function CaseAuctionFormPage() {
  const { id = '', requestId } = useParams()
  const isEdit = Boolean(requestId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const redirected = useRef(false)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [discountMin, setDiscountMin] = useState('')
  const [discountMax, setDiscountMax] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(!isEdit)
  const loaded = useQuery({
    queryKey: ['cases', 'auction', id, requestId],
    enabled: isEdit,
    queryFn: async () => (await api.get<AuctionRequest>(`/cases/${id}/auction/${requestId}`)).data,
  })

  useEffect(() => {
    const data = loaded.data
    if (!data) return
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
  }, [loaded.data])

  useEffect(() => {
    if (!loaded.isError || redirected.current) return
    redirected.current = true
    toast.error(getApiErrorMessage(loaded.error, t('common.error')))
    navigate(`/cases/${id}?stay=1`, { replace: true })
  }, [id, loaded.error, loaded.isError, navigate, t])

  useEffect(() => {
    if (!loaded.data || loaded.data.editable || redirected.current) return
    redirected.current = true
    toast.error(t('cases.auction.locked'))
    navigate(`/cases/${id}/auction/${requestId}`, { replace: true })
  }, [id, loaded.data, navigate, requestId, t])

  const backTo = `/cases/${id}?stay=1`
  const number = loaded.data ? localizeDigits(loaded.data.number, locale) : ''

  function patchItem(key: string, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
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
    for (const item of items) {
      const price = parseGroupedAmount(item.price)
      const discountPercent = parsePercent(item.discountPercent)
      if (!item.name.trim() || price == null || price < 1 || discountPercent == null) {
        toast.error(t('cases.auction.required'))
        return
      }
      if (hundredths(discountPercent) < hundredths(min) || hundredths(discountPercent) > hundredths(max)) {
        toast.error(t('cases.auction.itemDiscountRange'))
        return
      }
      payloadItems.push({ name: item.name.trim(), price, discountPercent })
    }
    setSaving(true)
    try {
      const body = { startsAt, endsAt, discountMin: min, discountMax: max, items: payloadItems }
      if (isEdit) await api.patch(`/cases/${id}/auction/${requestId}`, body)
      else await api.post(`/cases/${id}/auction`, body)
      toast.success(t(isEdit ? 'cases.auction.updated' : 'cases.auction.saved'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'home', id] })
      navigate(backTo)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Gavel}
        title={t(isEdit ? 'cases.auction.edit' : 'cases.auction.create')}
        subtitle={
          isEdit && number ? (
            <EntityNameSubtitle icon={Gavel} label={t('cases.requestNumber')} name={number} />
          ) : (
            t('cases.auction.createSubtitle')
          )
        }
        backTo={backTo}
      />
      {isEdit && loaded.isLoading ? <LoadingState /> : null}
      {ready && (!isEdit || loaded.data?.editable) ? (
        <FormCard
          icon={Gavel}
          title={isEdit && number ? number : t('cases.auction.create')}
          subtitle={isEdit ? undefined : t('cases.auction.createSubtitle')}
        >
          <AppForm onSubmit={submit} className={formCardBodyClassName}>
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
                          onChange={(event) => patchItem(item.key, { name: event.target.value })}
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
                          onChange={(event) => patchItem(item.key, { discountPercent: event.target.value })}
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
              submitLabel={t('common.save')}
              cancelLabel={t('common.cancel')}
              submitting={saving}
              onCancel={() => navigate(backTo)}
            />
          </AppForm>
        </FormCard>
      ) : null}
    </div>
  )
}
