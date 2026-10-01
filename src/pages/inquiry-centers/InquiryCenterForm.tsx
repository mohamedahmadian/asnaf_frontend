import { FileText, KeyRound, Mail, Phone, ScanSearch, ScrollText, ToggleRight, Type, UserPlus, UserRound, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AppForm,
  Button,
  FormActions,
  FormField,
  ToggleField,
  fieldClassName,
  inputClassName,
} from '../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { parseDigitString, toLatinDigits } from '../../lib/datetime'
import { isPhoneReady } from '../../lib/identity'
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

function mobileDigits(value: string) {
  let phone = parseDigitString(value)
  if (phone.startsWith('0098')) phone = phone.slice(4)
  else if (phone.startsWith('98') && phone.length >= 12) phone = phone.slice(2)
  if (phone.startsWith('9') && phone.length === 10) phone = `0${phone}`
  return phone
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
  const [addedOfficers, setAddedOfficers] = useState<InquiryCenterOfficer[]>([])
  const [officerModal, setOfficerModal] = useState(false)
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
    for (const officer of [initial?.officer, ...addedOfficers]) {
      if (officer && !options.some((option) => option.value === officer.id)) {
        options.unshift({ value: officer.id, label: officer.fullName })
      }
    }
    return [{ value: '', label: t('inquiryCenters.selectOfficer') }, ...options]
  }, [addedOfficers, initial?.officer, t, usersQuery.data])

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
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchSelect
                id="inquiryCenterOfficer"
                value={officerId}
                onChange={setOfficerId}
                placeholder={t('inquiryCenters.selectOfficer')}
                options={officerOptions}
              />
            </div>
            <Button
              type="button"
              variant="soft"
              className="shrink-0 whitespace-nowrap"
              onClick={() => setOfficerModal(true)}
            >
              <UserPlus className="size-4" aria-hidden />
              {t('inquiryCenters.addOfficer')}
            </Button>
          </div>
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
      {officerModal ? (
        <AddOfficerModal
          onClose={() => setOfficerModal(false)}
          onCreated={(officer) => {
            setAddedOfficers((current) =>
              current.some((item) => item.id === officer.id) ? current : [officer, ...current],
            )
            setOfficerId(officer.id)
            setOfficerModal(false)
          }}
        />
      ) : null}
    </FormCard>
  )
}

function AddOfficerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (officer: InquiryCenterOfficer) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function clearError(key: string) {
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    const normalizedPhone = mobileDigits(phone)
    if (!normalizedPhone) nextErrors.phone = t('users.phoneRequired')
    else if (!isPhoneReady(normalizedPhone, true)) nextErrors.phone = t('inquiryCenters.officerPhoneInvalid')
    if (firstName.trim().length < 2) nextErrors.firstName = t('users.nameRequired')
    if (lastName.trim().length < 2) nextErrors.lastName = t('users.nameRequired')
    if (password.length < 8) nextErrors.password = t('users.passwordMin')
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    try {
      const { data } = await api.post<InquiryCenterOfficer>('/inquiry-centers/officers', {
        phone: normalizedPhone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      })
      await queryClient.invalidateQueries({ queryKey: ['users', 'lookup', 'inquiry-centers'] })
      toast.success(t('inquiryCenters.officerAdded'))
      onCreated(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/30 p-4"
      data-nested-dialog
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <FormCard
        icon={UserPlus}
        title={t('inquiryCenters.addOfficerTitle')}
        subtitle={t('inquiryCenters.addOfficerSubtitle')}
        className="relative z-10 w-full max-w-lg"
        onDoubleClick={() => undefined}
        action={
          <Button type="button" variant="ghost" icon onClick={onClose} aria-label={t('common.close')} disabled={saving}>
            <X className="size-4" aria-hidden />
          </Button>
        }
      >
        <AppForm onSubmit={submit} autoFocusFirst className={formCardBodyClassName}>
          <FormField icon={Phone} label={t('users.phone')} htmlFor="officerPhone" error={fieldErrors.phone}>
            <input
              id="officerPhone"
              className={`${inputClassName(Boolean(fieldErrors.phone))} digit-field`}
              value={phone}
              onChange={(event) => {
                setPhone(parseDigitString(event.target.value).slice(0, 11))
                clearError('phone')
              }}
              inputMode="tel"
              autoComplete="off"
              required
              maxLength={11}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField icon={UserRound} label={t('users.firstName')} htmlFor="officerFirstName" error={fieldErrors.firstName}>
              <input
                id="officerFirstName"
                className={inputClassName(Boolean(fieldErrors.firstName))}
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value)
                  clearError('firstName')
                }}
                required
                minLength={2}
                maxLength={80}
              />
            </FormField>
            <FormField icon={UserRound} label={t('users.lastName')} htmlFor="officerLastName" error={fieldErrors.lastName}>
              <input
                id="officerLastName"
                className={inputClassName(Boolean(fieldErrors.lastName))}
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value)
                  clearError('lastName')
                }}
                required
                minLength={2}
                maxLength={80}
              />
            </FormField>
          </div>
          <FormField icon={KeyRound} label={t('users.password')} htmlFor="officerPassword" error={fieldErrors.password}>
            <input
              id="officerPassword"
              type="password"
              className={inputClassName(Boolean(fieldErrors.password))}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearError('password')
              }}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
            />
          </FormField>
          <FormActions
            headerIcons={false}
            submitLabel={t('inquiryCenters.addOfficer')}
            cancelLabel={t('inquiryCenters.cancel')}
            submitting={saving}
            onCancel={onClose}
          />
        </AppForm>
      </FormCard>
    </div>,
    document.body,
  )
}
