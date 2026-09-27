import { FileText, Mail, Phone, ScanSearch, ScrollText, ToggleRight, Type, UserRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { toLatinDigits } from '../../lib/datetime'
import type { InquiryCenterOfficer, ManagedUser, Paginated } from '../../types/app'

export type InquiryCenterPayload = {
  name: string
  description?: string | null
  phone?: string | null
  officerId?: string | null
  officer?: InquiryCenterOfficer | null
  letterTitle?: string | null
  letterBody?: string | null
  isActive: boolean
}

function asUserList(data: ManagedUser[] | Paginated<ManagedUser>) {
  return Array.isArray(data) ? data : data.items
}

export function InquiryCenterForm({
  initial,
  onSubmit,
}: {
  initial?: InquiryCenterPayload
  onSubmit: (payload: InquiryCenterPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [officerId, setOfficerId] = useState(initial?.officerId ?? '')
  const [letterTitle, setLetterTitle] = useState(initial?.letterTitle ?? '')
  const [letterBody, setLetterBody] = useState(initial?.letterBody ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const usersQuery = useQuery({
    queryKey: ['users', 'lookup', 'inquiry-centers'],
    queryFn: async () => {
      const { data } = await api.get<ManagedUser[] | Paginated<ManagedUser>>('/users', {
        params: { status: 'ACTIVE' },
      })
      return asUserList(data)
    },
  })

  const officerOptions = useMemo(() => {
    const users = usersQuery.data ?? []
    const options = users.map((user) => ({ value: user.id, label: user.fullName }))
    if (initial?.officer && !options.some((option) => option.value === initial.officer?.id)) {
      options.unshift({ value: initial.officer.id, label: initial.officer.fullName })
    }
    return [{ value: '', label: t('inquiryCenters.selectOfficer') }, ...options]
  }, [initial?.officer, t, usersQuery.data])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const digits = toLatinDigits(phone).replace(/\D/g, '')
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        phone: digits || null,
        officerId: officerId || null,
        letterTitle: letterTitle.trim() || null,
        letterBody: letterBody.trim() || null,
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
      icon={ScanSearch}
      title={initial ? initial.name : t('inquiryCenters.create')}
      subtitle={initial ? undefined : t('inquiryCenters.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('inquiryCenters.name')} htmlFor="inquiryCenterName">
          <input
            id="inquiryCenterName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={FileText} label={t('inquiryCenters.description')} htmlFor="inquiryCenterDescription">
          <textarea
            id="inquiryCenterDescription"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        <FormField icon={Phone} label={t('inquiryCenters.phone')} htmlFor="inquiryCenterPhone">
          <input
            id="inquiryCenterPhone"
            inputMode="tel"
            className={`${fieldClassName} digit-field`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
          />
        </FormField>
        <FormField icon={UserRound} label={t('inquiryCenters.officer')} htmlFor="inquiryCenterOfficer">
          <SearchSelect
            id="inquiryCenterOfficer"
            value={officerId}
            onChange={setOfficerId}
            placeholder={t('inquiryCenters.selectOfficer')}
            options={officerOptions}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('inquiryCenters.isActive')} htmlFor="inquiryCenterActive">
            <ToggleField
              id="inquiryCenterActive"
              checked={isActive}
              onChange={setIsActive}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        ) : null}
        <FormSectionTitle icon={ScrollText}>{t('inquiryCenters.letterSection')}</FormSectionTitle>
        <FormField icon={Mail} label={t('inquiryCenters.letterTitle')} htmlFor="inquiryCenterLetterTitle">
          <input
            id="inquiryCenterLetterTitle"
            className={fieldClassName}
            value={letterTitle}
            onChange={(e) => setLetterTitle(e.target.value)}
            maxLength={200}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('inquiryCenters.letterBody')} htmlFor="inquiryCenterLetterBody">
          <textarea
            id="inquiryCenterLetterBody"
            className={fieldClassName}
            value={letterBody}
            onChange={(e) => setLetterBody(e.target.value)}
            rows={8}
            maxLength={20000}
          />
        </FormField>
        <FormActions
          submitLabel={t('inquiryCenters.save')}
          cancelLabel={t('inquiryCenters.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
