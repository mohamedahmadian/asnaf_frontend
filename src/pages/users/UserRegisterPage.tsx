import { IdCard, KeyRound, Phone, UserPlus, UserRound } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AppForm,
  FormActions,
  FormField,
  PageHeader,
  inputClassName,
  userFormShellClassName,
} from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { UniqueFieldWrap, type UniqueCheckStatus } from '../../components/ui/UniqueFieldStatus'
import { api, getApiErrorMessage } from '../../lib/api'
import { parseDigitString } from '../../lib/datetime'
import { isPhoneReady } from '../../lib/identity'
import { isValidIranianNationalId, normalizeNationalId } from '../../lib/national-id'

type RegisterCheckResponse = {
  phoneLastNameTaken: boolean
  phoneTaken: boolean
  nationalIdTaken: boolean
  nationalIdOwnerName?: string | null
}

function omitError(current: Record<string, string>, ...ids: string[]) {
  const next = { ...current }
  let changed = false
  for (const id of ids) {
    if (id in next) {
      delete next[id]
      changed = true
    }
  }
  return changed ? next : current
}

export function UserRegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [phoneStatus, setPhoneStatus] = useState<UniqueCheckStatus>('idle')
  const [nationalIdStatus, setNationalIdStatus] = useState<UniqueCheckStatus>('idle')
  const [saving, setSaving] = useState(false)
  const checkSeq = useRef(0)
  const toastKey = useRef('')

  function clearErrors(...ids: string[]) {
    setFieldErrors((current) => omitError(current, ...ids))
  }

  const checkDuplicates = useCallback(
    async (
      values: { phone: string; lastName: string; nationalId: string },
      options?: { quiet?: boolean },
    ) => {
      const phoneDigits = parseDigitString(values.phone)
      const name = values.lastName.trim()
      const id = normalizeNationalId(values.nationalId)
      const phoneReady = isPhoneReady(phoneDigits, true)
      const idValid = id.length === 10 && isValidIranianNationalId(id)
      const pairReady = phoneReady && Boolean(name)

      if (id.length === 10 && !isValidIranianNationalId(id)) {
        setNationalIdStatus('idle')
        setFieldErrors((current) => ({
          ...current,
          nationalId: t('users.nationalIdInvalid'),
        }))
      }

      if (!pairReady && !idValid) {
        return id.length !== 10
      }

      const seq = ++checkSeq.current
      if (pairReady) setPhoneStatus('checking')
      if (idValid) setNationalIdStatus('checking')

      try {
        const { data } = await api.post<RegisterCheckResponse>('/users/register-check', {
          ...(pairReady ? { phone: phoneDigits, lastName: name } : {}),
          ...(idValid ? { nationalId: id } : {}),
        })
        if (seq !== checkSeq.current) return false

        const nextErrors: Record<string, string> = {}
        let notice = ''
        if (data.phoneLastNameTaken) {
          notice = t('users.phoneLastNameTaken')
          nextErrors.phone = notice
          nextErrors.lastName = notice
          setPhoneStatus('taken')
        } else if (pairReady && data.phoneTaken) {
          notice = t('users.phoneTaken')
          nextErrors.phone = notice
          setPhoneStatus('taken')
        } else if (pairReady) {
          setPhoneStatus('ok')
        }

        if (idValid) {
          if (data.nationalIdTaken) {
            const owner = data.nationalIdOwnerName?.trim()
            nextErrors.nationalId = owner
              ? t('users.nationalIdTaken', { name: owner })
              : t('users.nationalIdTakenUnknown')
            setNationalIdStatus('taken')
            notice = notice || nextErrors.nationalId
          } else {
            setNationalIdStatus('ok')
          }
        }

        setFieldErrors((current) => {
          const next = { ...current }
          if (pairReady) {
            delete next.phone
            delete next.lastName
          }
          if (idValid) delete next.nationalId
          return { ...next, ...nextErrors }
        })

        if (notice) {
          const key = `${notice}:${phoneDigits}:${name}:${id}`
          if (toastKey.current !== key) {
            toastKey.current = key
            toast.error(notice)
          }
        } else {
          toastKey.current = ''
        }
        return Object.keys(nextErrors).length === 0
      } catch (error) {
        if (seq === checkSeq.current) {
          setPhoneStatus('idle')
          setNationalIdStatus('idle')
        }
        if (!options?.quiet) toast.error(getApiErrorMessage(error, t('common.error')))
        return false
      }
    },
    [t],
  )

  useEffect(() => {
    const phoneDigits = parseDigitString(phone)
    const name = lastName.trim()
    const id = normalizeNationalId(nationalId)
    const shouldCheck =
      (isPhoneReady(phoneDigits, true) && Boolean(name)) ||
      (id.length === 10 && isValidIranianNationalId(id))
    if (!shouldCheck) return
    const timer = window.setTimeout(() => {
      void checkDuplicates({ phone, lastName, nationalId }, { quiet: true })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [phone, lastName, nationalId, checkDuplicates])

  function resetForm() {
    checkSeq.current += 1
    toastKey.current = ''
    setFirstName('')
    setLastName('')
    setPhone('')
    setNationalId('')
    setPassword('')
    setFieldErrors({})
    setPhoneStatus('idle')
    setNationalIdStatus('idle')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const phoneDigits = parseDigitString(phone)
    const name = lastName.trim()
    const given = firstName.trim()
    const id = normalizeNationalId(nationalId)
    const nextErrors: Record<string, string> = {}
    if (!given) nextErrors.firstName = t('users.nameRequired')
    if (!name) nextErrors.lastName = t('users.nameRequired')
    if (!phoneDigits) nextErrors.phone = t('users.phoneRequired')
    else if (!isPhoneReady(phoneDigits, true)) nextErrors.phone = t('users.phoneInvalid')
    if (!id) nextErrors.nationalId = t('users.nationalIdRequired')
    else if (!isValidIranianNationalId(id)) nextErrors.nationalId = t('users.nationalIdInvalid')
    if (password.length < 8) nextErrors.password = t('users.passwordMin')
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const available = await checkDuplicates({ phone: phoneDigits, lastName: name, nationalId: id })
      if (!available) return
      await api.post('/users/register', {
        firstName: given,
        lastName: name,
        phone: phoneDigits,
        nationalId: id,
        password,
      })
      toast.success(t('users.created'))
      navigate('/users')
    } catch (error) {
      const message = getApiErrorMessage(error, t('common.error'))
      if (message.includes('تلفن و نام خانوادگی')) {
        const taken = t('users.phoneLastNameTaken')
        setFieldErrors((current) => ({
          ...current,
          phone: taken,
          lastName: taken,
        }))
        setPhoneStatus('taken')
        toast.error(taken)
        return
      }
      if (message.includes('تلفن')) {
        const taken = t('users.phoneTaken')
        setFieldErrors((current) => ({ ...current, phone: taken }))
        setPhoneStatus('taken')
        toast.error(taken)
        return
      }
      if (message.includes('کد ملی') || message.includes('نام کاربری')) {
        const taken = t('users.nationalIdTakenUnknown')
        setFieldErrors((current) => ({
          ...current,
          nationalId: taken,
        }))
        setNationalIdStatus('taken')
        toast.error(taken)
        return
      }
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={userFormShellClassName}>
      <PageHeader icon={UserPlus} title={t('menus.userRegister')} />
      <FormCard
        icon={UserPlus}
        title={t('menus.userRegister')}
        subtitle={t('users.registerSubtitle')}
      >
        <AppForm autoFocusFirst onSubmit={submit} className={formCardBodyClassName}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField icon={UserRound} label={t('users.firstName')} htmlFor="firstName" error={fieldErrors.firstName}>
              <input
                id="firstName"
                className={inputClassName(Boolean(fieldErrors.firstName))}
                value={firstName}
                required
                autoComplete="given-name"
                onChange={(event) => {
                  setFirstName(event.target.value)
                  clearErrors('firstName')
                }}
              />
            </FormField>
            <FormField icon={UserRound} label={t('users.lastName')} htmlFor="lastName" error={fieldErrors.lastName}>
              <input
                id="lastName"
                className={inputClassName(Boolean(fieldErrors.lastName))}
                value={lastName}
                required
                autoComplete="family-name"
                aria-invalid={Boolean(fieldErrors.lastName)}
                onChange={(event) => {
                  setLastName(event.target.value)
                  setPhoneStatus('idle')
                  clearErrors('lastName', 'phone')
                }}
              />
            </FormField>
          </div>
          <FormField icon={Phone} label={t('users.phone')} htmlFor="phone" error={fieldErrors.phone}>
            <UniqueFieldWrap
              status={phoneStatus}
              availableLabel={t('users.identityAvailable')}
              checkingLabel={t('users.identityChecking')}
            >
              <input
                id="phone"
                className={`${inputClassName(Boolean(fieldErrors.phone))} digit-field`}
                value={phone}
                required
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                aria-invalid={Boolean(fieldErrors.phone)}
                onChange={(event) => {
                  setPhone(parseDigitString(event.target.value).slice(0, 11))
                  setPhoneStatus('idle')
                  clearErrors('phone', 'lastName')
                }}
              />
            </UniqueFieldWrap>
          </FormField>
          <FormField icon={IdCard} label={t('users.nationalId')} htmlFor="nationalId" error={fieldErrors.nationalId}>
            <UniqueFieldWrap
              status={nationalIdStatus}
              availableLabel={t('users.identityAvailable')}
              checkingLabel={t('users.identityChecking')}
            >
              <input
                id="nationalId"
                className={`${inputClassName(Boolean(fieldErrors.nationalId))} digit-field`}
                value={nationalId}
                required
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                aria-invalid={Boolean(fieldErrors.nationalId)}
                onChange={(event) => {
                  const next = parseDigitString(event.target.value).slice(0, 10)
                  setNationalId(next)
                  setNationalIdStatus('idle')
                  if (next.length === 10 && !isValidIranianNationalId(next)) {
                    setFieldErrors((current) => ({
                      ...omitError(current, 'nationalId'),
                      nationalId: t('users.nationalIdInvalid'),
                    }))
                    return
                  }
                  clearErrors('nationalId')
                }}
              />
            </UniqueFieldWrap>
          </FormField>
          <FormField icon={KeyRound} label={t('users.password')} htmlFor="password" error={fieldErrors.password}>
            <input
              id="password"
              type="password"
              className={inputClassName(Boolean(fieldErrors.password))}
              value={password}
              required
              minLength={8}
              autoComplete="new-password"
              onChange={(event) => {
                setPassword(event.target.value)
                clearErrors('password')
              }}
            />
          </FormField>
          <FormActions
            headerIcons
            submitLabel={t('users.save')}
            cancelLabel={t('common.cancel')}
            submitting={saving}
            onCancel={resetForm}
          />
        </AppForm>
      </FormCard>
    </div>
  )
}
