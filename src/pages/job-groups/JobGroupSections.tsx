import { FolderKanban, HardHat, IdCard, KeyRound, Phone, Plus, Trash2, UserRound, Users } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { confirmToast } from '../../components/ui/confirmToast'
import {
  AppForm,
  Button,
  FormActions,
  FormField,
  inputClassName,
} from '../../components/ui/Form'
import { FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { SearchSelect } from '../../components/ui/SearchSelect'
import {
  ActionsTh,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getApiErrorMessage } from '../../lib/api'
import { localizeDigits, parseDigitString } from '../../lib/datetime'
import { isPhoneReady } from '../../lib/identity'
import { isValidIranianNationalId, normalizeNationalId } from '../../lib/national-id'
import {
  jobGroupJobMembershipApi,
  jobGroupRepresentativeApi,
  jobGroupRepresentativesApi,
  jobsApi,
} from '../../lib/paths/job-groups'
import { jobsCatalogApi } from '../../lib/paths/jobs'
import type { Job, JobGroupRepresentative, Paginated } from '../../types/app'

export type JobGroupSection = 'info' | 'representatives' | 'jobs'

function readJobGroupSection(value: string | null): JobGroupSection {
  if (value === 'representatives' || value === 'jobs') return value
  return 'info'
}

export function useJobGroupSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section = readJobGroupSection(searchParams.get('section'))

  function setSection(next: JobGroupSection) {
    const params = new URLSearchParams(searchParams)
    if (next === 'info') params.delete('section')
    else params.set('section', next)
    params.delete('q')
    params.delete('page')
    params.delete('sortBy')
    params.delete('sortDir')
    setSearchParams(params, { replace: true })
  }

  return { section, setSection }
}

export function JobGroupSectionTabs({
  section,
  onChange,
}: {
  section: JobGroupSection
  onChange: (next: JobGroupSection) => void
}) {
  const { t } = useTranslation()
  const tabs: { id: JobGroupSection; label: string; icon: typeof FolderKanban }[] = [
    { id: 'info', label: t('jobGroups.infoTab'), icon: FolderKanban },
    { id: 'jobs', label: t('jobGroups.jobsTab'), icon: HardHat },
    { id: 'representatives', label: t('jobGroups.representativesTab'), icon: Users },
  ]

  return <FormTabs value={section} onChange={(id) => onChange(id as JobGroupSection)} tabs={tabs} />
}

function mobileDigits(value: string) {
  let phone = parseDigitString(value)
  if (phone.startsWith('0098')) phone = phone.slice(4)
  else if (phone.startsWith('98') && phone.length >= 12) phone = phone.slice(2)
  if (phone.startsWith('9') && phone.length === 10) phone = `0${phone}`
  return phone
}

export function JobGroupRepresentatives({
  jobGroupId,
  manage = false,
}: {
  jobGroupId: string
  manage?: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const [nationalId, setNationalId] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const query = useQuery({
    queryKey: ['job-group-representatives', jobGroupId, q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<JobGroupRepresentative>>(
        jobGroupRepresentativesApi(jobGroupId),
        { params: { q: q || undefined, page, ...sortParams } },
      )
      return data
    },
  })

  function clearError(key: string) {
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function resetForm() {
    setNationalId('')
    setPhone('')
    setFirstName('')
    setLastName('')
    setPassword('')
    setFieldErrors({})
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    const normalizedId = normalizeNationalId(nationalId)
    const normalizedPhone = mobileDigits(phone)
    if (!normalizedId) nextErrors.nationalId = t('users.nationalIdRequired')
    else if (!isValidIranianNationalId(normalizedId)) nextErrors.nationalId = t('users.nationalIdInvalid')
    if (!normalizedPhone) nextErrors.phone = t('users.phoneRequired')
    else if (!isPhoneReady(normalizedPhone, true)) nextErrors.phone = t('jobGroups.phoneInvalid')
    if (firstName.trim().length < 2) nextErrors.firstName = t('users.nameRequired')
    if (lastName.trim().length < 2) nextErrors.lastName = t('users.nameRequired')
    if (password.length < 8) nextErrors.password = t('users.passwordMin')
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    try {
      await api.post(jobGroupRepresentativesApi(jobGroupId), {
        nationalId: normalizedId,
        phone: normalizedPhone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      })
      await queryClient.invalidateQueries({ queryKey: ['job-group-representatives', jobGroupId] })
      toast.success(t('jobGroups.representativeAdded'))
      resetForm()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  function remove(item: JobGroupRepresentative) {
    confirmToast({
      title: t('jobGroups.confirmRemoveRepresentative'),
      confirmLabel: t('common.yesDelete'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(jobGroupRepresentativeApi(jobGroupId, item.id))
          await queryClient.invalidateQueries({ queryKey: ['job-group-representatives', jobGroupId] })
          toast.success(t('jobGroups.representativeRemoved'))
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
        }
      },
    })
  }

  const rows = query.data?.items ?? []

  return (
    <div
      role="tabpanel"
      id="form-panel-representatives"
      aria-labelledby="form-tab-representatives"
      className={formCardBodyClassName}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {manage ? (
        <AppForm onSubmit={submit} autoFocusFirst className="space-y-4">
          <FormSectionTitle icon={Users} className="mb-0">
            {t('jobGroups.addRepresentative')}
          </FormSectionTitle>
          <p className="text-sm text-ink-500">{t('jobGroups.representativesHint')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              icon={IdCard}
              label={t('users.nationalId')}
              htmlFor="repNationalId"
              error={fieldErrors.nationalId}
            >
              <input
                id="repNationalId"
                className={`${inputClassName(Boolean(fieldErrors.nationalId))} digit-field`}
                value={nationalId}
                onChange={(event) => {
                  setNationalId(parseDigitString(event.target.value).slice(0, 10))
                  clearError('nationalId')
                }}
                inputMode="numeric"
                autoComplete="off"
                required
                maxLength={10}
              />
            </FormField>
            <FormField icon={Phone} label={t('users.phone')} htmlFor="repPhone" error={fieldErrors.phone}>
              <input
                id="repPhone"
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
            <FormField
              icon={UserRound}
              label={t('users.firstName')}
              htmlFor="repFirstName"
              error={fieldErrors.firstName}
            >
              <input
                id="repFirstName"
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
            <FormField
              icon={UserRound}
              label={t('users.lastName')}
              htmlFor="repLastName"
              error={fieldErrors.lastName}
            >
              <input
                id="repLastName"
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
            <FormField
              icon={KeyRound}
              label={t('users.password')}
              htmlFor="repPassword"
              error={fieldErrors.password}
            >
              <input
                id="repPassword"
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
          </div>
          <FormActions
            headerIcons={false}
            submitLabel={t('jobGroups.addRepresentative')}
            submitting={saving}
          />
        </AppForm>
      ) : null}
      <SearchBar
        autoFocus={false}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('jobGroups.representativesSearch')}
        placeholder={t('jobGroups.representativesSearchPlaceholder')}
      />
      <TableCard
        rowClick={false}
        loading={query.isLoading}
        empty={q ? t('jobGroups.representativesNoResults') : t('jobGroups.representativesEmpty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="fullName"
                label={t('users.fullName')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="nationalId"
                label={t('users.nationalId')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="phone"
                label={t('users.phone')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              {manage ? <ActionsTh /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.fullName}</td>
                <td className="px-4 py-3">
                  <CopyableDigits value={item.nationalId} />
                </td>
                <td className="px-4 py-3">
                  <CopyableDigits value={item.phone} />
                </td>
                {manage ? (
                  <td className={actionsColClassName}>
                    <div data-row-actions className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                      <Button
                        type="button"
                        variant="ghost"
                        icon
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                        onClick={() => remove(item)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}

function asList<T>(data: T[] | Paginated<T>) {
  return Array.isArray(data) ? data : data.items
}

export function JobGroupJobs({
  jobGroupId,
  manage = false,
}: {
  jobGroupId: string
  manage?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const [pick, setPick] = useState('')
  const [saving, setSaving] = useState(false)

  const query = useQuery({
    queryKey: ['jobs', jobGroupId, 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Job>>(jobsApi(jobGroupId), {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const catalogQuery = useQuery({
    queryKey: ['jobs-catalog', 'lookup'],
    enabled: manage,
    queryFn: async () => {
      const { data } = await api.get<Job[] | Paginated<Job>>(jobsCatalogApi())
      return asList(data)
    },
  })

  const options = (catalogQuery.data ?? [])
    .filter((item) => item.groupId !== jobGroupId)
    .map((item) => ({
      value: item.id,
      label: item.group ? `${item.title} — ${item.group.title}` : item.title,
    }))

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['jobs', jobGroupId] }),
      queryClient.invalidateQueries({ queryKey: ['jobs-catalog'] }),
      queryClient.invalidateQueries({ queryKey: ['job-group', jobGroupId] }),
      queryClient.invalidateQueries({ queryKey: ['job-groups'] }),
    ])
  }

  async function add() {
    if (!pick || saving) return
    setSaving(true)
    try {
      await api.post(jobGroupJobMembershipApi(jobGroupId, pick))
      await refresh()
      toast.success(t('jobGroups.jobAdded'))
      setPick('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  function remove(item: Job) {
    confirmToast({
      title: t('jobGroups.confirmRemoveJob'),
      confirmLabel: t('common.yesDelete'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(jobGroupJobMembershipApi(jobGroupId, item.id))
          await refresh()
          toast.success(t('jobGroups.jobRemoved'))
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
        }
      },
    })
  }

  const rows = query.data?.items ?? []

  return (
    <div
      role="tabpanel"
      id="form-panel-jobs"
      aria-labelledby="form-tab-jobs"
      className={formCardBodyClassName}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {manage ? (
        <div className="space-y-4">
          <FormSectionTitle icon={HardHat} className="mb-0">
            {t('jobGroups.addJob')}
          </FormSectionTitle>
          <p className="text-sm text-ink-500">{t('jobGroups.jobsHint')}</p>
          <FormField icon={HardHat} label={t('jobGroups.selectJob')} htmlFor="jobGroupJobAdd">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SearchSelect
                  id="jobGroupJobAdd"
                  value={pick}
                  onChange={setPick}
                  placeholder={
                    !catalogQuery.isLoading && options.length === 0
                      ? t('jobGroups.noJobsToAdd')
                      : t('jobGroups.selectJob')
                  }
                  disabled={saving || catalogQuery.isLoading || options.length === 0}
                  options={options}
                />
              </div>
              <Button type="button" variant="soft" className="shrink-0" disabled={!pick || saving} onClick={add}>
                <Plus className="size-4" aria-hidden />
                {t('jobGroups.addJob')}
              </Button>
            </div>
          </FormField>
        </div>
      ) : null}
      <SearchBar
        autoFocus={false}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('jobGroups.jobsSearch')}
        placeholder={t('jobGroups.jobsSearchPlaceholder')}
      />
      <TableCard
        rowClick={false}
        loading={query.isLoading}
        empty={q ? t('jobGroups.jobsNoResults') : t('jobGroups.jobsEmpty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('jobCatalog.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="jobType"
                label={t('jobCatalog.jobType')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="taxIntaCode"
                label={t('jobCatalog.taxIntaCode')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              {manage ? <ActionsTh /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.title || '—'}</td>
                <td className="px-4 py-3">{item.jobType.title}</td>
                <td className="px-4 py-3" dir="ltr">
                  {item.taxIntaCode ? localizeDigits(item.taxIntaCode, locale) : '—'}
                </td>
                {manage ? (
                  <td className={actionsColClassName}>
                    <div data-row-actions className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                      <Button
                        type="button"
                        variant="ghost"
                        icon
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                        onClick={() => remove(item)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}
