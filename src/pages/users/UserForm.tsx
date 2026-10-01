import {
  Briefcase,
  Building2,
  Car,
  FileText,
  Flag,
  IdCard,
  ImagePlus,
  KeyRound,
  Languages,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  ToggleRight,
  UserRound,
  UserRoundPlus,
} from 'lucide-react'
import axios from 'axios'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { FileDropField } from '../../components/ui/FileDropField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import {
  AppForm,
  Button,
  FormField,
  FormActions,
  ToggleField,
  fieldClassName,
  inputClassName,
} from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { UniqueFieldWrap, type UniqueCheckStatus } from '../../components/ui/UniqueFieldStatus'
import { selectableLanguages, selectableLocale } from '../../i18n'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { parseDigitString, toLatinDigits } from '../../lib/datetime'
import { useGeoName } from '../../lib/geo'
import { normalizeNationalId } from '../../lib/national-id'
import {
  isLikelyEmail,
  isPhoneReady,
  preferEnglishKeyboard,
  sanitizeUsername,
  USERNAME_ENGLISH_PATTERN,
} from '../../lib/identity'
import { EMPLOYEE_ROLE_CODE } from '../../lib/roles'
import { optimizeImageFile } from '../../lib/optimize-image'
import {
  religions,
  userGenders,
  userStatuses,
  type City,
  type Country,
  type ManagedUser,
  type AppRole,
  type StaffPost,
  type WorkUnit,
  type Province,
  type Religion,
  type UserGender,
  type UserStatus,
} from '../../types/app'

const tabs = ['personal', 'account', 'location', 'documents', 'social', 'other'] as const

type PhotoField = 'photo' | 'nationalCard' | 'passport' | 'identityBooklet'

type IdentityCheckResponse = {
  taken: boolean
  nationalIdTaken?: boolean
  nationalIdOwnerName?: string | null
  phoneTaken?: boolean
  usernameTaken?: boolean
  emailTaken?: boolean
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function omitError(current: Record<string, string>, id: string) {
  if (!(id in current)) return current
  const { [id]: _, ...rest } = current
  return rest
}

export type UserPayload = {
  username: string
  password?: string
  firstName: string
  lastName: string
  locale: string
  status: UserStatus
  gender: UserGender | null
  nationalId: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  religion: Religion | null
  religionOther: string | null
  telegram: string | null
  bale: string | null
  eitaa: string | null
  whatsapp: string | null
  otherSocial: string | null
  vehiclePlates: string[]
  countryId: string | null
  provinceId: string | null
  cityId: string | null
  photoId: string | null
  nationalCardPhotoId: string | null
  passportPhotoId: string | null
  identityBookletPhotoId: string | null
  workUnitId: string | null
  staffPostId: string | null
  roleIds: string[]
}

export function UserForm({
  initial,
  hidePassword = false,
  hideStatus = false,
  requirePassword = true,
  identityCheckPath = '/users/identity-check',
  selfProfile = false,
  onCancel,
  onSubmit,
}: {
  initial?: ManagedUser
  hidePassword?: boolean
  hideStatus?: boolean
  requirePassword?: boolean
  identityCheckPath?: string
  selfProfile?: boolean
  onCancel: () => void
  onSubmit: (payload: UserPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const geoName = useGeoName()
  const usernameTouched = useRef(Boolean(initial?.username))
  const [tab, setTab] = useState<string>('personal')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [lastName, setLastName] = useState(initial?.lastName ?? '')
  const [password, setPassword] = useState('')
  const [locale, setLocale] = useState(selectableLocale(initial?.locale))
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? userStatuses.ACTIVE)
  const [gender, setGender] = useState(initial?.gender ?? '')
  const [nationalId, setNationalId] = useState(initial?.nationalId ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [religion, setReligion] = useState(initial?.religion ?? '')
  const [religionOther, setReligionOther] = useState(initial?.religionOther ?? '')
  const [telegram, setTelegram] = useState(initial?.telegram ?? '')
  const [bale, setBale] = useState(initial?.bale ?? '')
  const [eitaa, setEitaa] = useState(initial?.eitaa ?? '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  const [otherSocial, setOtherSocial] = useState(initial?.otherSocial ?? '')
  const [vehiclePlates, setVehiclePlates] = useState<string[]>(
    initial?.vehiclePlates?.length ? initial.vehiclePlates : [''],
  )
  const [countryId, setCountryId] = useState(initial?.countryId ?? '')
  const [provinceId, setProvinceId] = useState(initial?.provinceId ?? '')
  const [cityId, setCityId] = useState(initial?.cityId ?? '')
  const [photoId, setPhotoId] = useState(initial?.photoId ?? '')
  const [nationalCardPhotoId, setNationalCardPhotoId] = useState(initial?.nationalCardPhotoId ?? '')
  const [passportPhotoId, setPassportPhotoId] = useState(initial?.passportPhotoId ?? '')
  const [identityBookletPhotoId, setIdentityBookletPhotoId] = useState(
    initial?.identityBookletPhotoId ?? '',
  )
  const [workUnitId, setWorkUnitId] = useState(initial?.workUnitId ?? '')
  const [staffPostId, setStaffPostId] = useState(initial?.staffPostId ?? '')
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roles?.map((role) => role.id) ?? [])
  const [uploading, setUploading] = useState<PhotoField>()
  const [saving, setSaving] = useState(false)
  const [checkingNationalId, setCheckingNationalId] = useState(false)
  const [nationalIdReady, setNationalIdReady] = useState(Boolean(initial?.nationalId))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [phoneStatus, setPhoneStatus] = useState<UniqueCheckStatus>(initial?.phone ? 'ok' : 'idle')
  const [emailStatus, setEmailStatus] = useState<UniqueCheckStatus>(initial?.email ? 'ok' : 'idle')
  const [identityStatus, setIdentityStatus] = useState<UniqueCheckStatus>(
    initial?.nationalId ? 'ok' : 'idle',
  )
  const pendingFocusId = useRef<string | null>(null)
  const lastNationalIdCheck = useRef<string | null>(null)
  const lastPhoneCheck = useRef<string | null>(null)
  const lastUsernameCheck = useRef<string | null>(null)
  const lastEmailCheck = useRef<string | null>(null)
  const nationalIdCheckSeq = useRef(0)
  const phoneCheckSeq = useRef(0)
  const usernameCheckSeq = useRef(0)
  const emailCheckSeq = useRef(0)
  const isCreate = !initial?.id

  useEffect(() => {
    const id = pendingFocusId.current
    if (!id) return
    pendingFocusId.current = null
    const el = document.getElementById(id)
    if (!(el instanceof HTMLElement)) return
    el.focus()
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [tab, fieldErrors])

  function setFieldError(id: string, message: string) {
    setFieldErrors((current) => ({ ...current, [id]: message }))
  }

  function clearError(id: string) {
    setFieldErrors((current) => omitError(current, id))
  }

  function failField(nextTab: string, fieldId: string, message: string) {
    pendingFocusId.current = fieldId
    setFieldError(fieldId, message)
    toast.error(message)
    if (tab !== nextTab) setTab(nextTab)
  }

  const countries = useQuery({
    queryKey: ['countries', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Country[]>('/countries', { params: { activeOnly: true } })
      return data
    },
  })
  const workUnits = useQuery({
    queryKey: ['work-units', 'lookup'],
    enabled: !selfProfile,
    queryFn: async () => {
      const { data } = await api.get<WorkUnit[]>('/work-units')
      return data
    },
  })
  const staffPosts = useQuery({
    queryKey: ['staff-posts', 'lookup'],
    enabled: !selfProfile,
    queryFn: async () => {
      const { data } = await api.get<StaffPost[]>('/staff-posts')
      return data
    },
  })
  const roles = useQuery({
    queryKey: ['roles', 'lookup'],
    enabled: !selfProfile,
    queryFn: async () => {
      const { data } = await api.get<AppRole[]>('/roles')
      return data
    },
  })
  useEffect(() => {
    if (!isCreate || selfProfile) return
    const employee = (roles.data ?? []).find((role) => role.code === EMPLOYEE_ROLE_CODE)
    if (!employee) return
    setRoleIds((current) => (current.length ? current : [employee.id]))
  }, [isCreate, selfProfile, roles.data])
  const iranCountryId = countries.data?.find((country) => country.iso2 === 'IR')?.id ?? ''
  const selectedCountryId = countryId || (isCreate ? iranCountryId : '')
  const isIranian = !iranCountryId || !selectedCountryId || selectedCountryId === iranCountryId
  const phoneRequired = selfProfile ? isIranian : true
  const provinces = useQuery({
    queryKey: ['provinces', 'lookup', selectedCountryId],
    enabled: Boolean(selectedCountryId),
    queryFn: async () => {
      const { data } = await api.get<Province[]>('/provinces', {
        params: { countryId: selectedCountryId, activeOnly: true },
      })
      return data
    },
  })
  const cities = useQuery({
    queryKey: ['cities', 'lookup', provinceId],
    enabled: Boolean(provinceId),
    queryFn: async () => {
      const { data } = await api.get<City[]>('/cities', {
        params: { provinceId, activeOnly: true },
      })
      return data
    },
  })

  async function uploadImage(file: File, field: PhotoField) {
    setUploading(field)
    try {
      const optimized = await optimizeImageFile(file)
      const body = new FormData()
      body.append('file', optimized)
      const { data } = await api.post<{ id: string }>('/images', body)
      if (field === 'photo') setPhotoId(data.id)
      if (field === 'nationalCard') setNationalCardPhotoId(data.id)
      if (field === 'passport') setPassportPhotoId(data.id)
      if (field === 'identityBooklet') setIdentityBookletPhotoId(data.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(undefined)
    }
  }

  function nationalIdTakenMessage(name?: string | null) {
    const trimmed = name?.trim()
    return trimmed
      ? t('users.nationalIdTaken', { name: trimmed })
      : t('users.nationalIdTakenUnknown')
  }

  async function checkNationalIdTaken(raw?: string): Promise<boolean> {
    const value = normalizeNationalId(raw ?? nationalId)
    if (!value) {
      lastNationalIdCheck.current = null
      setNationalIdReady(false)
      setIdentityStatus('idle')
      clearError('nationalId')
      return true
    }
    if (initial?.nationalId && normalizeNationalId(initial.nationalId) === value) {
      lastNationalIdCheck.current = value
      setNationalIdReady(true)
      setIdentityStatus('ok')
      clearError('nationalId')
      return true
    }
    if (lastNationalIdCheck.current === value && nationalIdReady && !fieldErrors.nationalId) {
      return true
    }
    lastNationalIdCheck.current = value
    const seq = ++nationalIdCheckSeq.current
    setCheckingNationalId(true)
    setIdentityStatus('checking')
    setNationalIdReady(false)
    try {
      const { data } = await api.post<IdentityCheckResponse>(identityCheckPath, {
        nationalId: value,
        ...(initial?.id ? { excludeId: initial.id } : {}),
      })
      if (seq !== nationalIdCheckSeq.current) return false
      if (data.nationalIdTaken ?? data.taken) {
        setNationalIdReady(false)
        setIdentityStatus('taken')
        const message = nationalIdTakenMessage(data.nationalIdOwnerName)
        setFieldError('nationalId', message)
        toast.error(message)
        return false
      }
      setNationalIdReady(true)
      setIdentityStatus('ok')
      clearError('nationalId')
      return true
    } catch (error) {
      if (seq === nationalIdCheckSeq.current) {
        lastNationalIdCheck.current = null
        setNationalIdReady(false)
        setIdentityStatus('idle')
      }
      if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') return false
      return false
    } finally {
      if (seq === nationalIdCheckSeq.current) setCheckingNationalId(false)
    }
  }

  async function checkPhoneTaken(raw?: string): Promise<boolean> {
    const value = parseDigitString(raw ?? phone).trim()
    if (!value) {
      lastPhoneCheck.current = null
      setPhoneStatus('idle')
      clearError('phone')
      return !phoneRequired
    }
    if (initial?.phone && parseDigitString(initial.phone) === value) {
      lastPhoneCheck.current = value
      setPhoneStatus('ok')
      clearError('phone')
      return true
    }
    if (lastPhoneCheck.current === value && phoneStatus === 'ok') return true
    lastPhoneCheck.current = value
    const seq = ++phoneCheckSeq.current
    setPhoneStatus('checking')
    try {
      const { data } = await api.post<IdentityCheckResponse>(identityCheckPath, {
        phone: value,
        ...(initial?.id ? { excludeId: initial.id } : {}),
      })
      if (seq !== phoneCheckSeq.current) return false
      if (data.phoneTaken ?? data.taken) {
        setPhoneStatus('taken')
        const message = t('users.phoneTaken')
        setFieldError('phone', message)
        toast.error(message)
        return false
      }
      setPhoneStatus('ok')
      clearError('phone')
      return true
    } catch (error) {
      if (seq === phoneCheckSeq.current) {
        lastPhoneCheck.current = null
        setPhoneStatus('idle')
      }
      if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') return false
      return false
    }
  }

  async function checkUsernameTaken(): Promise<boolean> {
    const value = username.trim()
    if (value.length < 3) return false
    if (initial?.username && initial.username === value) {
      lastUsernameCheck.current = value
      return true
    }
    if (lastUsernameCheck.current === value) return true
    lastUsernameCheck.current = value
    const seq = ++usernameCheckSeq.current
    try {
      const { data } = await api.post<IdentityCheckResponse>(identityCheckPath, {
        username: value,
        ...(initial?.id ? { excludeId: initial.id } : {}),
      })
      if (seq !== usernameCheckSeq.current) return false
      if (data.usernameTaken ?? data.taken) {
        failField('account', 'username', t('users.usernameTaken'))
        lastUsernameCheck.current = null
        return false
      }
      clearError('username')
      return true
    } catch (error) {
      if (seq === usernameCheckSeq.current) lastUsernameCheck.current = null
      if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') return false
      return false
    }
  }

  async function checkEmailTaken(raw?: string): Promise<boolean> {
    const value = toLatinDigits(raw ?? email).trim().toLowerCase()
    if (!value) {
      lastEmailCheck.current = null
      setEmailStatus('idle')
      clearError('email')
      return true
    }
    if (!isLikelyEmail(value)) {
      setEmailStatus('idle')
      return true
    }
    if (initial?.email && initial.email.toLowerCase() === value) {
      lastEmailCheck.current = value
      setEmailStatus('ok')
      return true
    }
    if (lastEmailCheck.current === value && emailStatus === 'ok') return true
    lastEmailCheck.current = value
    const seq = ++emailCheckSeq.current
    setEmailStatus('checking')
    try {
      const { data } = await api.post<IdentityCheckResponse>(identityCheckPath, {
        email: value,
        ...(initial?.id ? { excludeId: initial.id } : {}),
      })
      if (seq !== emailCheckSeq.current) return false
      if (data.emailTaken ?? data.taken) {
        setEmailStatus('taken')
        const message = t('users.emailTaken')
        setFieldError('email', message)
        toast.error(message)
        return false
      }
      setEmailStatus('ok')
      clearError('email')
      return true
    } catch (error) {
      if (seq === emailCheckSeq.current) {
        lastEmailCheck.current = null
        setEmailStatus('idle')
      }
      if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') return false
      return false
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!firstName.trim()) {
      failField('personal', 'firstName', t('users.nameRequired'))
      return
    }
    if (!lastName.trim()) {
      failField('personal', 'lastName', t('users.nameRequired'))
      return
    }
    const phoneDigits = parseDigitString(phone)
    if (phoneRequired && !phoneDigits) {
      failField('personal', 'phone', t('users.phoneRequired'))
      return
    }
    const emailValue = toLatinDigits(email).trim()
    if (emailValue && !isLikelyEmail(emailValue)) {
      failField('other', 'email', t('users.emailInvalid'))
      return
    }
    if (!username.trim() || username.trim().length < 3) {
      failField('account', 'username', t('users.usernameMin'))
      return
    }
    if (!USERNAME_ENGLISH_PATTERN.test(username.trim())) {
      failField('account', 'username', t('users.usernameEnglish'))
      return
    }
    if (requirePassword || password) {
      if (password.length < 8) {
        failField('account', 'password', t('users.passwordMin'))
        return
      }
    }
    if (!(await checkNationalIdTaken())) {
      pendingFocusId.current = 'nationalId'
      if (tab !== 'personal') setTab('personal')
      return
    }
    if (!(await checkPhoneTaken())) {
      pendingFocusId.current = 'phone'
      if (tab !== 'personal') setTab('personal')
      return
    }
    if (!(await checkEmailTaken())) {
      pendingFocusId.current = 'email'
      if (tab !== 'other') setTab('other')
      return
    }
    if (!(await checkUsernameTaken())) {
      pendingFocusId.current = 'username'
      if (tab !== 'account') setTab('account')
      return
    }
    if (!selfProfile && roleIds.length === 0) {
      failField('account', 'roleIds', t('users.rolesRequired'))
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        locale,
        status,
        gender: gender ? (gender as UserGender) : null,
        nationalId: emptyToNull(normalizeNationalId(nationalId)),
        phone: emptyToNull(phoneDigits),
        email: emptyToNull(emailValue),
        address: emptyToNull(address),
        notes: emptyToNull(notes),
        religion: religion ? (religion as Religion) : null,
        religionOther: religion === religions.OTHER ? emptyToNull(religionOther) : null,
        telegram: emptyToNull(telegram),
        bale: emptyToNull(bale),
        eitaa: emptyToNull(eitaa),
        whatsapp: emptyToNull(whatsapp),
        otherSocial: emptyToNull(otherSocial),
        vehiclePlates: vehiclePlates.map((item) => item.trim()).filter(Boolean),
        countryId: emptyToNull(selectedCountryId),
        provinceId: emptyToNull(provinceId),
        cityId: emptyToNull(cityId),
        photoId: emptyToNull(photoId),
        nationalCardPhotoId: emptyToNull(nationalCardPhotoId),
        passportPhotoId: emptyToNull(passportPhotoId),
        identityBookletPhotoId: emptyToNull(identityBookletPhotoId),
        workUnitId: emptyToNull(workUnitId),
        staffPostId: emptyToNull(staffPostId),
        roleIds,
        ...(password ? { password } : {}),
      })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const message = getApiErrorMessage(error, t('users.usernameTaken'))
        if (message.includes('کد ملی')) {
          failField('personal', 'nationalId', t('users.nationalIdTakenUnknown'))
        } else if (message.includes('تلفن')) {
          failField('personal', 'phone', t('users.phoneTaken'))
        } else if (message.includes('ایمیل')) {
          failField('other', 'email', t('users.emailTaken'))
        } else {
          failField('account', 'username', t('users.usernameTaken'))
        }
      } else {
        toast.error(getApiErrorMessage(error, t('common.error')))
      }
    } finally {
      setSaving(false)
    }
  }

  const isEdit = Boolean(initial?.id)
  const displayName =
    initial?.fullName?.trim() ||
    [initial?.firstName, initial?.lastName].filter(Boolean).join(' ').trim()

  return (
    <FormCard
      icon={UserRound}
      title={isEdit ? displayName || t('users.edit') : t('users.create')}
      subtitle={isEdit ? undefined : t('users.createSubtitle')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <nav className="flex flex-wrap gap-2 rounded-2xl border border-line bg-cream-50/80 p-3">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                tab === item
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-white text-ink-700 hover:bg-cream-100'
              }`}
            >
              {t(`users.tabs.${item}`)}
            </button>
          ))}
        </nav>

        <AppForm noValidate onSubmit={submit} className="space-y-4">
          <div className={`space-y-4 ${tab === 'personal' ? '' : 'hidden'}`}>
            <FormField icon={IdCard} label={t('users.nationalId')} htmlFor="nationalId" error={fieldErrors.nationalId}>
              <UniqueFieldWrap
                status={identityStatus}
                availableLabel={t('users.identityAvailable')}
                checkingLabel={t('users.identityChecking')}
              >
                <input
                  id="nationalId"
                  className={inputClassName(Boolean(fieldErrors.nationalId))}
                  value={nationalId}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  aria-invalid={Boolean(fieldErrors.nationalId)}
                  aria-busy={checkingNationalId}
                  onChange={(e) => {
                    lastNationalIdCheck.current = null
                    const next = parseDigitString(e.target.value).slice(0, 10)
                    setNationalId(next)
                    setNationalIdReady(false)
                    setIdentityStatus('idle')
                    clearError('nationalId')
                    if (next.length === 10) void checkNationalIdTaken(next)
                  }}
                  onBlur={() => {
                    if (nationalId.trim()) void checkNationalIdTaken()
                  }}
                />
              </UniqueFieldWrap>
            </FormField>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField icon={UserRound} label={t('users.firstName')} htmlFor="firstName" error={fieldErrors.firstName}>
                  <input
                    id="firstName"
                    className={inputClassName(Boolean(fieldErrors.firstName))}
                    value={firstName}
                    required
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      clearError('firstName')
                    }}
                  />
                </FormField>
                <FormField icon={UserRound} label={t('users.lastName')} htmlFor="lastName" error={fieldErrors.lastName}>
                  <input
                    id="lastName"
                    className={inputClassName(Boolean(fieldErrors.lastName))}
                    value={lastName}
                    required
                    onChange={(e) => {
                      setLastName(e.target.value)
                      clearError('lastName')
                    }}
                  />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField icon={Phone} label={t('users.phone')} htmlFor="phone" error={fieldErrors.phone}>
                  <UniqueFieldWrap
                    status={phoneStatus}
                    availableLabel={t('users.identityAvailable')}
                    checkingLabel={t('users.identityChecking')}
                  >
                    <input
                      id="phone"
                      className={inputClassName(Boolean(fieldErrors.phone))}
                      value={phone}
                      required={phoneRequired}
                      onChange={(e) => {
                        const value = parseDigitString(e.target.value).slice(0, isIranian ? 11 : 15)
                        lastPhoneCheck.current = null
                        setPhone(value)
                        setPhoneStatus('idle')
                        clearError('phone')
                        if (!usernameTouched.current) {
                          setUsername(sanitizeUsername(value))
                          clearError('username')
                        }
                        if (isPhoneReady(value, isIranian)) void checkPhoneTaken(value)
                      }}
                      onBlur={() => {
                        if (phoneRequired || parseDigitString(phone)) void checkPhoneTaken()
                      }}
                    />
                  </UniqueFieldWrap>
                </FormField>
                <FormField icon={UserRound} label={t('users.gender')} htmlFor="gender">
                  <SearchSelect
                    id="gender"
                    value={gender}
                    onChange={setGender}
                    placeholder={t('users.selectOptional')}
                    options={[
                      { value: '', label: t('users.selectOptional') },
                      ...Object.values(userGenders).map((item) => ({
                        value: item,
                        label: t(`userGenders.${item}`),
                      })),
                    ]}
                  />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField icon={Building2} label={t('users.orgUnit')} htmlFor="workUnitId">
                  {selfProfile ? (
                    <input
                      id="workUnitId"
                      className={`${fieldClassName} cursor-default bg-cream-50`}
                      value={initial?.workUnit?.title || '—'}
                      readOnly
                    />
                  ) : (
                    <SearchSelect
                      id="workUnitId"
                      value={workUnitId}
                      onChange={setWorkUnitId}
                      placeholder={t('users.selectOrgUnit')}
                      options={[
                        { value: '', label: t('users.selectOrgUnit') },
                        ...(workUnits.data ?? [])
                          .filter((unit) => unit.isActive || unit.id === workUnitId)
                          .sort((a, b) => a.title.localeCompare(b.title, 'fa'))
                          .map((unit) => ({
                            value: unit.id,
                            label: unit.title,
                          })),
                      ]}
                    />
                  )}
                </FormField>
                <FormField icon={Briefcase} label={t('users.position')} htmlFor="staffPostId">
                  {selfProfile ? (
                    <input
                      id="staffPostId"
                      className={`${fieldClassName} cursor-default bg-cream-50`}
                      value={initial?.staffPost?.title || '—'}
                      readOnly
                    />
                  ) : (
                    <SearchSelect
                      id="staffPostId"
                      value={staffPostId}
                      onChange={setStaffPostId}
                      placeholder={t('users.selectPosition')}
                      options={[
                        { value: '', label: t('users.selectPosition') },
                        ...(staffPosts.data ?? [])
                          .filter((item) => item.isActive || item.id === staffPostId)
                          .sort((a, b) => a.title.localeCompare(b.title, 'fa'))
                          .map((item) => ({ value: item.id, label: item.title })),
                      ]}
                    />
                  )}
                </FormField>
              </div>
              {selfProfile ? (
                <p className="text-xs text-ink-500">{t('users.orgAssignmentReadOnly')}</p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField icon={Share2} label={t('users.religion')} htmlFor="religion">
                  <SearchSelect
                    id="religion"
                    value={religion}
                    onChange={setReligion}
                    placeholder={t('users.selectOptional')}
                    options={[
                      { value: '', label: t('users.selectOptional') },
                      ...Object.values(religions).map((item) => ({
                        value: item,
                        label: t(`religions.${item}`),
                      })),
                    ]}
                  />
                </FormField>
                {religion === religions.OTHER ? (
                  <FormField icon={FileText} label={t('users.religionOther')} htmlFor="religionOther">
                    <input
                      id="religionOther"
                      className={fieldClassName}
                      value={religionOther}
                      onChange={(e) => setReligionOther(e.target.value)}
                    />
                  </FormField>
                ) : null}
              </div>
            </div>
          </div>

          <div className={`space-y-4 ${tab === 'account' ? '' : 'hidden'}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={UserRoundPlus} label={t('users.username')} htmlFor="username" error={fieldErrors.username}>
                <input
                  id="username"
                  lang="en"
                  dir="ltr"
                  className={`${inputClassName(Boolean(fieldErrors.username))} latin-field`}
                  value={username}
                  required
                  minLength={3}
                  onChange={(e) => {
                    usernameTouched.current = true
                    lastUsernameCheck.current = null
                    setUsername(sanitizeUsername(e.target.value))
                    clearError('username')
                  }}
                  onMouseEnter={(e) => preferEnglishKeyboard(e.currentTarget)}
                  onFocus={(e) => preferEnglishKeyboard(e.currentTarget)}
                  onBlur={() => {
                    if (username.trim().length >= 3) void checkUsernameTaken()
                  }}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  pattern="[A-Za-z0-9._-]+"
                  title={t('users.usernameEnglish')}
                />
              </FormField>
              <FormField icon={Languages} label={t('users.locale')} htmlFor="locale">
                <SearchSelect
                  id="locale"
                  value={locale}
                  onChange={setLocale}
                  options={selectableLanguages().map((code) => ({
                    value: code,
                    label: t(`languages.${code}`),
                  }))}
                />
              </FormField>
              {hidePassword ? null : (
                <FormField icon={KeyRound} label={t('users.password')} htmlFor="password" error={fieldErrors.password}>
                  <input
                    id="password"
                    type="password"
                    className={inputClassName(Boolean(fieldErrors.password))}
                    value={password}
                    required={requirePassword}
                    minLength={requirePassword ? 8 : undefined}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      clearError('password')
                    }}
                    autoComplete="new-password"
                  />
                  {!requirePassword ? (
                    <p className="text-xs text-ink-500">{t('users.passwordOptional')}</p>
                  ) : null}
                </FormField>
              )}
            </div>
            {selfProfile ? null : (
              <FormField icon={Shield} label={t('users.roles')} htmlFor="roleIds" error={fieldErrors.roleIds}>
                <div id="roleIds" className="grid gap-2">
                  {(roles.data ?? []).map((role) => (
                    <CheckboxField
                      key={role.id}
                      id={`user-role-${role.id}`}
                      checked={roleIds.includes(role.id)}
                      label={role.name}
                      onChange={(checked) => {
                        setRoleIds((current) =>
                          checked
                            ? [...current, role.id]
                            : current.filter((item) => item !== role.id),
                        )
                        clearError('roleIds')
                      }}
                    />
                  ))}
                </div>
              </FormField>
            )}
          </div>

          <div className={`space-y-4 ${tab === 'location' ? '' : 'hidden'}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={Flag} label={t('geo.country')} htmlFor="countryId">
                <SearchSelect
                  id="countryId"
                  value={selectedCountryId}
                  onChange={(next) => {
                    setCountryId(next)
                    setProvinceId('')
                    setCityId('')
                  }}
                  placeholder={t('geo.selectCountry')}
                  options={[
                    { value: '', label: t('geo.selectCountry') },
                    ...(countries.data ?? []).map((country) => ({
                      value: country.id,
                      label: geoName(country),
                    })),
                  ]}
                />
              </FormField>
              <FormField icon={MapPinned} label={t('geo.province')} htmlFor="provinceId">
                <SearchSelect
                  id="provinceId"
                  value={provinceId}
                  disabled={!selectedCountryId}
                  onChange={(next) => {
                    setProvinceId(next)
                    setCityId('')
                  }}
                  placeholder={t('geo.selectProvince')}
                  options={[
                    { value: '', label: t('geo.selectProvince') },
                    ...(provinces.data ?? []).map((province) => ({
                      value: province.id,
                      label: geoName(province),
                    })),
                  ]}
                />
              </FormField>
              <FormField icon={MapPin} label={t('geo.city')} htmlFor="cityId">
                <SearchSelect
                  id="cityId"
                  value={cityId}
                  disabled={!provinceId}
                  onChange={setCityId}
                  placeholder={t('geo.selectCity')}
                  options={[
                    { value: '', label: t('geo.selectCity') },
                    ...(cities.data ?? []).map((city) => ({
                      value: city.id,
                      label: geoName(city),
                    })),
                  ]}
                />
              </FormField>
            </div>
            <FormField icon={MapPin} label={t('users.address')} htmlFor="address">
              <textarea
                id="address"
                className={fieldClassName}
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </FormField>
          </div>

          <div className={`space-y-4 ${tab === 'documents' ? '' : 'hidden'}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={ImagePlus} label={t('users.photo')} htmlFor="photo">
                <FileDropField
                  id="photo"
                  accept="image/*"
                  capture="user"
                  previewUrl={photoId ? getImageUrl(photoId) : undefined}
                  uploading={uploading === 'photo'}
                  onFile={(file) => void uploadImage(file, 'photo')}
                  onClear={() => setPhotoId('')}
                />
              </FormField>
              <FormField icon={IdCard} label={t('users.nationalCardPhoto')} htmlFor="nationalCardPhoto">
                <FileDropField
                  id="nationalCardPhoto"
                  accept="image/*"
                  capture="environment"
                  previewUrl={nationalCardPhotoId ? getImageUrl(nationalCardPhotoId) : undefined}
                  uploading={uploading === 'nationalCard'}
                  onFile={(file) => void uploadImage(file, 'nationalCard')}
                  onClear={() => setNationalCardPhotoId('')}
                />
              </FormField>
              <FormField icon={IdCard} label={t('users.passportPhoto')} htmlFor="passportPhoto">
                <FileDropField
                  id="passportPhoto"
                  accept="image/*"
                  capture="environment"
                  previewUrl={passportPhotoId ? getImageUrl(passportPhotoId) : undefined}
                  uploading={uploading === 'passport'}
                  onFile={(file) => void uploadImage(file, 'passport')}
                  onClear={() => setPassportPhotoId('')}
                />
              </FormField>
              <FormField icon={FileText} label={t('users.identityBookletPhoto')} htmlFor="identityBookletPhoto">
                <FileDropField
                  id="identityBookletPhoto"
                  accept="image/*"
                  capture="environment"
                  previewUrl={identityBookletPhotoId ? getImageUrl(identityBookletPhotoId) : undefined}
                  uploading={uploading === 'identityBooklet'}
                  onFile={(file) => void uploadImage(file, 'identityBooklet')}
                  onClear={() => setIdentityBookletPhotoId('')}
                />
              </FormField>
            </div>
          </div>

          <div className={`space-y-4 ${tab === 'social' ? '' : 'hidden'}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={MessageCircle} label={t('users.telegram')} htmlFor="telegram">
                <input id="telegram" className={`${fieldClassName} latin-field`} dir="ltr" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
              </FormField>
              <FormField icon={MessageCircle} label={t('users.bale')} htmlFor="bale">
                <input id="bale" className={`${fieldClassName} latin-field`} dir="ltr" value={bale} onChange={(e) => setBale(e.target.value)} />
              </FormField>
              <FormField icon={MessageCircle} label={t('users.eitaa')} htmlFor="eitaa">
                <input id="eitaa" className={`${fieldClassName} latin-field`} dir="ltr" value={eitaa} onChange={(e) => setEitaa(e.target.value)} />
              </FormField>
              <FormField icon={Phone} label={t('users.whatsapp')} htmlFor="whatsapp">
                <input id="whatsapp" className={`${fieldClassName} latin-field`} dir="ltr" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </FormField>
              <FormField icon={Share2} label={t('users.otherSocial')} htmlFor="otherSocial">
                <input id="otherSocial" className={`${fieldClassName} latin-field`} dir="ltr" value={otherSocial} onChange={(e) => setOtherSocial(e.target.value)} />
              </FormField>
            </div>
          </div>

          <div className={`space-y-4 ${tab === 'other' ? '' : 'hidden'}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={Mail} label={t('users.email')} htmlFor="email" error={fieldErrors.email}>
                <UniqueFieldWrap
                  status={emailStatus}
                  availableLabel={t('users.identityAvailable')}
                  checkingLabel={t('users.identityChecking')}
                >
                  <input
                    id="email"
                    type="email"
                    className={`${inputClassName(Boolean(fieldErrors.email))} latin-field`}
                    value={email}
                    onChange={(e) => {
                      lastEmailCheck.current = null
                      const next = toLatinDigits(e.target.value)
                      setEmail(next)
                      setEmailStatus('idle')
                      clearError('email')
                      if (isLikelyEmail(next)) void checkEmailTaken(next)
                    }}
                    onBlur={() => {
                      if (toLatinDigits(email).trim()) void checkEmailTaken()
                    }}
                  />
                </UniqueFieldWrap>
              </FormField>
              {hideStatus ? null : (
                <FormField icon={ToggleRight} label={t('users.status')} htmlFor="status">
                  <ToggleField
                    id="status"
                    checked={status === userStatuses.ACTIVE}
                    onChange={(active) => setStatus(active ? userStatuses.ACTIVE : userStatuses.INACTIVE)}
                    onLabel={t('userStatuses.ACTIVE')}
                    offLabel={t('userStatuses.INACTIVE')}
                  />
                </FormField>
              )}
            </div>
            <FormField icon={Car} label={t('users.vehiclePlates')}>
              <div className="space-y-2">
                {vehiclePlates.map((plate, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className={fieldClassName}
                      value={plate}
                      onChange={(e) => {
                        const next = [...vehiclePlates]
                        next[index] = e.target.value
                        setVehiclePlates(next)
                      }}
                    />
                    {vehiclePlates.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setVehiclePlates(vehiclePlates.filter((_, i) => i !== index))}
                      >
                        {t('users.removePlate')}
                      </Button>
                    ) : null}
                  </div>
                ))}
                <Button type="button" variant="ghost" onClick={() => setVehiclePlates([...vehiclePlates, ''])}>
                  {t('users.addPlate')}
                </Button>
              </div>
            </FormField>
            <FormField icon={FileText} label={t('users.notes')} htmlFor="notes">
              <textarea
                id="notes"
                className={fieldClassName}
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>
          </div>

          <FormActions
            submitLabel={t('users.save')}
            cancelLabel={t('users.cancel')}
            submitting={saving}
            onCancel={onCancel}
          />
        </AppForm>
      </div>
    </FormCard>
  )
}
