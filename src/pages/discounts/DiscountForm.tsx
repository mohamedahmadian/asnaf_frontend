import { CalendarDays, FileText, Percent, ToggleRight, Type, Workflow } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../lib/api'
import { currentPersianYear, persianYearOptions, toLatinDigits } from '../../lib/datetime'
import {
  financialProcessTypes,
  type FinancialProcessType,
} from '../../types/app'

export type DiscountPayload = {
  year: number
  title: string
  percent: number
  processTypes: FinancialProcessType[]
  appliesToAllRequests: boolean
  description?: string | null
  isActive: boolean
}

export function DiscountForm({
  initial,
  onSubmit,
}: {
  initial?: DiscountPayload
  onSubmit: (payload: DiscountPayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [year, setYear] = useState(String(initial?.year ?? currentPersianYear()))
  const [title, setTitle] = useState(initial?.title ?? '')
  const [percent, setPercent] = useState(initial ? String(initial.percent) : '')
  const [processTypes, setProcessTypes] = useState<FinancialProcessType[]>(
    initial?.appliesToAllRequests ? [] : (initial?.processTypes ?? []),
  )
  const [allRequests, setAllRequests] = useState(initial?.appliesToAllRequests ?? false)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const yearOptions = useMemo(
    () => persianYearOptions(locale, Number(year) || undefined),
    [locale, year],
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        year: Number(year),
        title: title.trim(),
        percent: Number(toLatinDigits(percent).replace(/,/g, '.')),
        processTypes: allRequests ? [] : processTypes,
        appliesToAllRequests: allRequests,
        description: description.trim() || null,
        isActive,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Percent}
      title={initial ? initial.title : t('discounts.create')}
      subtitle={initial ? undefined : t('discounts.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={CalendarDays} label={t('discounts.year')} htmlFor="discountYear">
          <SearchSelect
            id="discountYear"
            value={year}
            onChange={setYear}
            placeholder={t('discounts.selectYear')}
            required
            options={yearOptions}
          />
        </FormField>
        <FormField icon={Type} label={t('discounts.title')} htmlFor="discountTitle">
          <input
            id="discountTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={Percent} label={t('discounts.percent')} htmlFor="discountPercent">
          <input
            id="discountPercent"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            className={`${fieldClassName} digit-field`}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            required
          />
        </FormField>
        <FormField
          icon={Workflow}
          label={t('discounts.processTypes')}
          htmlFor="discountProcessTypes"
        >
          <div id="discountProcessTypes" className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CheckboxField
                id="discount-process-all"
                checked={allRequests}
                label={t('discounts.allRequests')}
                onChange={(checked) => {
                  setAllRequests(checked)
                  if (checked) setProcessTypes([])
                }}
              />
            </div>
            {Object.values(financialProcessTypes).map((processType) => (
              <CheckboxField
                key={processType}
                id={`discount-process-${processType}`}
                checked={!allRequests && processTypes.includes(processType)}
                disabled={allRequests}
                label={t(`municipalFees.processType.${processType}`)}
                onChange={(checked) =>
                  setProcessTypes((current) =>
                    checked
                      ? [...current, processType]
                      : current.filter((item) => item !== processType),
                  )
                }
              />
            ))}
          </div>
        </FormField>
        <FormField icon={FileText} label={t('discounts.description')} htmlFor="discountDescription">
          <textarea
            id="discountDescription"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('discounts.isActive')} htmlFor="discountActive">
            <ToggleField
              id="discountActive"
              checked={isActive}
              onChange={setIsActive}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        ) : null}
        <FormActions
          submitLabel={t('discounts.save')}
          cancelLabel={t('discounts.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
