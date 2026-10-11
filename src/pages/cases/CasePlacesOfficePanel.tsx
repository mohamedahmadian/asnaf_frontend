import { Mail, Phone, ScrollText, Shield } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { toLatinDigits } from '../../lib/datetime'
import type { AppRole } from '../../types/app'

type PlacesOffice = {
  id: string
  phone: string | null
  officerRoleId: string | null
  officerRoleName: string | null
  letterTitle: string | null
  letterBody: string | null
}

export function CasePlacesOfficePanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [officerRoleId, setOfficerRoleId] = useState('')
  const [phone, setPhone] = useState('')
  const [letterTitle, setLetterTitle] = useState('')
  const [letterBody, setLetterBody] = useState('')
  const [saving, setSaving] = useState(false)
  const office = useQuery({
    queryKey: ['cases', 'places-office'],
    queryFn: async () => (await api.get<PlacesOffice>('/cases/settings/places-office')).data,
  })
  const roles = useQuery({
    queryKey: ['roles', 'lookup'],
    queryFn: async () => (await api.get<AppRole[]>('/roles')).data,
  })

  useEffect(() => {
    if (!office.data) return
    setOfficerRoleId(office.data.officerRoleId ?? '')
    setPhone(office.data.phone ?? '')
    setLetterTitle(office.data.letterTitle ?? '')
    setLetterBody(office.data.letterBody ?? '')
  }, [office.data])

  function reset() {
    setOfficerRoleId(office.data?.officerRoleId ?? '')
    setPhone(office.data?.phone ?? '')
    setLetterTitle(office.data?.letterTitle ?? '')
    setLetterBody(office.data?.letterBody ?? '')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const digits = toLatinDigits(phone).replace(/\D/g, '')
      await api.put('/cases/settings/places-office', {
        officerRoleId: officerRoleId || null,
        phone: digits || null,
        letterTitle: letterTitle.trim() || null,
        letterBody: letterBody.trim() || null,
      })
      toast.success(t('cases.placesOfficerSaved'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'places-office'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  const options = [
    { value: '', label: t('cases.placesSelectOfficer') },
    ...(roles.data ?? [])
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, 'fa'))
      .map((role) => ({ value: role.id, label: role.name })),
  ]
  if (office.data?.officerRoleId && !options.some((option) => option.value === office.data?.officerRoleId)) {
    options.splice(1, 0, {
      value: office.data.officerRoleId,
      label: office.data.officerRoleName || office.data.officerRoleId,
    })
  }

  return (
    <AppForm onSubmit={submit} className="space-y-4" autoFocusFirst={false}>
      <FormField icon={Shield} label={t('cases.placesOfficer')} htmlFor="places-officer">
        <SearchSelect
          id="places-officer"
          value={officerRoleId}
          onChange={setOfficerRoleId}
          placeholder={t('cases.placesSelectOfficer')}
          options={options}
        />
      </FormField>
      <FormField icon={Phone} label={t('users.phone')} htmlFor="places-phone">
        <input
          id="places-phone"
          inputMode="tel"
          className={`${fieldClassName} digit-field`}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          maxLength={20}
        />
      </FormField>
      <FormField icon={Mail} label={t('cases.placesLetterTitle')} htmlFor="places-letter-title">
        <input
          id="places-letter-title"
          className={fieldClassName}
          value={letterTitle}
          onChange={(event) => setLetterTitle(event.target.value)}
          maxLength={200}
        />
      </FormField>
      <FormField icon={ScrollText} label={t('cases.placesLetterBody')} htmlFor="places-letter-body">
        <textarea
          id="places-letter-body"
          className={fieldClassName}
          rows={6}
          value={letterBody}
          onChange={(event) => setLetterBody(event.target.value)}
          maxLength={8000}
        />
      </FormField>
      <FormActions
        headerIcons={false}
        submitting={saving}
        submitLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onCancel={reset}
      />
    </AppForm>
  )
}
