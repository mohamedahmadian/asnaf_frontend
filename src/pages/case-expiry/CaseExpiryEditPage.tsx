import {
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  CalendarCog,
  CalendarDays,
  CalendarX,
  FileBadge2,
  IdCard,
  Layers,
  Store,
  UserRound,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AppForm,
  EntityNameSubtitle,
  FormActions,
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
} from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { api, getApiErrorMessage } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { type CaseExpiryRow, caseExpiryListPath } from './case-expiry'

export function CaseExpiryEditPage() {
  const { id } = useParams()
  const query = useQuery({
    queryKey: ['case-expiry', 'item', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<CaseExpiryRow>(`/case-expiry/${id}`)).data,
  })

  if (!query.data || !query.isFetchedAfterMount) {
    return <LoadingState />
  }

  return <CaseExpiryForm item={query.data} />
}

function CaseExpiryForm({ item }: { item: CaseExpiryRow }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expiresAt, setExpiresAt] = useState(item.expiresAt ?? '')
  const [saving, setSaving] = useState(false)
  const listPath = caseExpiryListPath(item.nationalId)
  const licenseNumber = item.licenseNumber ? localizeDigits(item.licenseNumber, locale) : '—'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!expiresAt) {
      toast.error(t('cases.expiry.expiresRequired'))
      return
    }
    setSaving(true)
    try {
      await api.put(`/case-expiry/${item.id}`, { expiresAt })
      await queryClient.invalidateQueries({ queryKey: ['case-expiry'] })
      await queryClient.invalidateQueries({ queryKey: ['cases'] })
      toast.success(t('cases.expiry.updated'))
      navigate(listPath)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={CalendarCog}
        title={t('cases.expiry.edit')}
        subtitle={<EntityNameSubtitle name={item.fullName} icon={UserRound} />}
        backTo={listPath}
      />
      <FormCard icon={FileBadge2} title={<span dir="ltr">{licenseNumber}</span>}>
        <AppForm onSubmit={submit} className={formCardBodyClassName}>
          <FormSectionTitle icon={FileBadge2}>{t('cases.expiry.caseInfo')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            <FormFactTile icon={UserRound} label={t('users.fullName')} value={item.fullName} tone="teal" />
            <FormFactTile icon={IdCard} label={t('users.nationalId')} copyValue={item.nationalId} tone="mint" />
            <FormFactTile
              icon={Layers}
              label={t('cases.expiry.kind')}
              value={t(`cases.expiry.kinds.${item.kind}`)}
              tone="teal"
            />
            <FormFactTile icon={Briefcase} label={t('cases.job')} value={item.job?.title} empty={!item.job} tone="mint" />
            <FormFactTile
              icon={Store}
              label={t('cases.listJobTitle')}
              value={item.jobTitle}
              empty={!item.jobTitle}
              tone="teal"
            />
            <FormFactTile
              icon={BadgeCheck}
              label={t('cases.expiry.status')}
              value={t(`cases.caseStatuses.${item.status}`)}
              tone="mint"
            />
            <FormFactTile
              icon={CalendarCheck}
              label={t('cases.listIssued')}
              value={item.issuedAt ? <DateText value={item.issuedAt} /> : undefined}
              empty={!item.issuedAt}
              tone="teal"
            />
            <FormFactTile
              icon={CalendarX}
              label={t('cases.listExpires')}
              value={item.expiresAt ? <DateText value={item.expiresAt} /> : undefined}
              empty={!item.expiresAt}
              tone="mint"
            />
          </div>
          <FormField icon={CalendarDays} label={t('cases.expiry.newExpiresAt')} htmlFor="case-expiry-date">
            <PersianDateField
              id="case-expiry-date"
              value={expiresAt || undefined}
              minDate={item.issuedAt ?? undefined}
              onChange={(next) => setExpiresAt(next ?? '')}
            />
            <input className="sr-only" tabIndex={-1} value={expiresAt} required onChange={() => undefined} />
          </FormField>
          <FormActions
            submitLabel={t('cases.expiry.save')}
            cancelLabel={t('cases.expiry.cancel')}
            submitting={saving}
            onCancel={() => navigate(listPath)}
          />
        </AppForm>
      </FormCard>
    </div>
  )
}
