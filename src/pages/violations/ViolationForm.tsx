import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  FileText,
  Files,
  Folders,
  History,
  IdCard,
  Layers,
  MapPin,
  Mic,
  Paperclip,
  ShieldAlert,
  Store,
  Tag,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import {
  AppForm,
  Button,
  FormActions,
  FormField,
  fieldClassName,
} from '../../components/ui/Form'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { formatNumber, localizeDigits, todayIsoDate } from '../../lib/datetime'
import { isValidIranianNationalId, normalizeNationalId } from '../../lib/national-id'
import type {
  ViolationAttachment,
  ViolationCaseFile,
  ViolationPersonLookup,
  ViolationStatus,
  ViolationType,
} from '../../types/app'
import { AttachmentField } from './AttachmentField'
import { CaseViolationsModal } from './CaseViolationsModal'
import { VIOLATION_STATUSES } from './constants'
import { DescriptionDictation } from './DescriptionDictation'
import { isAudioAttachment } from './files'
import { VoiceRecorderField } from './VoiceRecorderField'

function isAudioFile(file: File) {
  return file.type.startsWith('audio/')
}

const OTHER_VIOLATION_TYPE = 'سایر'

export type ViolationFormValue = {
  nationalId: string
  violationTypeId: string
  occurredAt: string
  description: string
  status: ViolationStatus
  attachments?: ViolationAttachment[]
  personName?: string | null
  caseUserId?: string | null
}

function isOtherViolationType(title: string | undefined) {
  return title?.trim() === OTHER_VIOLATION_TYPE
}

export function ViolationForm({
  initial,
  preset,
  currentViolationId,
  attachmentPreviewHref,
  onSubmit,
}: {
  initial?: ViolationFormValue
  preset?: { nationalId: string; caseId: string }
  currentViolationId?: string
  attachmentPreviewHref?: (attachmentId: string) => string
  onSubmit: (payload: {
    nationalId: string
    violationTypeId: string
    occurredAt: string
    description: string | null
    status: ViolationStatus
    caseUserId: string | null
    files: File[]
    removeAttachmentIds: string[]
  }) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [nationalId, setNationalId] = useState(initial?.nationalId ?? preset?.nationalId ?? '')
  const [violationTypeId, setViolationTypeId] = useState(initial?.violationTypeId ?? '')
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt ?? todayIsoDate())
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<ViolationStatus>(initial?.status ?? 'REGISTERED')
  const [caseUserId, setCaseUserId] = useState(initial?.caseUserId ?? preset?.caseId ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [attachmentsOpen, setAttachmentsOpen] = useState(Boolean(initial))
  const [recording, setRecording] = useState(false)
  const [dictating, setDictating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [historyCase, setHistoryCase] = useState<ViolationCaseFile | null>(null)
  const [showOtherCases, setShowOtherCases] = useState(false)
  const normalizedId = normalizeNationalId(nationalId)
  const idReady = isValidIranianNationalId(normalizedId)

  const types = useQuery({
    queryKey: ['violation-types', 'lookup'],
    queryFn: async () => (await api.get<ViolationType[]>('/violation-types')).data,
  })
  const person = useQuery({
    queryKey: ['violation-person', normalizedId],
    enabled: idReady,
    queryFn: async () =>
      (await api.get<ViolationPersonLookup>('/violations/person', { params: { nationalId: normalizedId } })).data,
  })
  const cases = person.data?.cases ?? []
  const linkedCaseId = initial?.caseUserId ?? preset?.caseId ?? ''
  const linkedCase = cases.find((item) => item.id === linkedCaseId)
  const focusLinkedCase = Boolean(linkedCaseId && linkedCase && !showOtherCases)
  const visibleCases = focusLinkedCase && linkedCase ? [linkedCase] : cases

  useEffect(() => {
    setShowOtherCases(false)
  }, [normalizedId])

  useEffect(() => {
    if (!idReady) {
      setCaseUserId('')
      return
    }
    if (!person.data) return
    setCaseUserId((current) =>
      current && !person.data.cases.some((item) => item.id === current) ? '' : current,
    )
  }, [idReady, person.data])

  const typeOptions = types.data ?? []
  const orderedTypes = [
    ...typeOptions.filter((item) => item.isActive || item.id === violationTypeId).filter((item) => !isOtherViolationType(item.title)),
    ...typeOptions.filter((item) => (item.isActive || item.id === violationTypeId) && isOtherViolationType(item.title)),
  ]
  const selectedType = orderedTypes.find((item) => item.id === violationTypeId)
  const otherType = isOtherViolationType(selectedType?.title)
  const displayName = person.data?.fullName || initial?.personName || normalizedId
  const documentFiles = useMemo(() => files.filter((file) => !isAudioFile(file)), [files])
  const audioFiles = useMemo(() => files.filter(isAudioFile), [files])
  const existingAttachments = initial?.attachments ?? []
  const existingDocuments = existingAttachments.filter((item) => !isAudioAttachment(item))
  const existingAudio = existingAttachments.filter((item) => isAudioAttachment(item) && attachmentPreviewHref)

  function toggleRemove(attachmentId: string) {
    setRemovedIds((current) =>
      current.includes(attachmentId) ? current.filter((item) => item !== attachmentId) : [...current, attachmentId],
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!idReady) {
      toast.error(t('violations.nationalIdInvalid'))
      return
    }
    if (!violationTypeId || !occurredAt || !status) {
      toast.error(t('violations.requiredFields'))
      return
    }
    if (otherType && !description.trim()) {
      toast.error(t('violations.otherDescriptionRequired'))
      return
    }
    if (recording) {
      toast.error(t('violations.voiceStillRecording'))
      return
    }
    if (dictating) {
      toast.error(t('violations.dictationBusy'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        nationalId: normalizedId,
        violationTypeId,
        occurredAt,
        description: description.trim() || null,
        status,
        caseUserId: caseUserId || null,
        files,
        removeAttachmentIds: removedIds,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <FormCard
        icon={ShieldAlert}
        title={initial ? displayName : t('violations.create')}
        subtitle={initial ? undefined : t('violations.createSubtitle')}
      >
        <AppForm onSubmit={submit} className={formCardBodyClassName}>
          <FormField icon={IdCard} label={t('violations.nationalId')} htmlFor="violationNationalId">
            <input
              id="violationNationalId"
              className={`${fieldClassName} digit-field`}
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
              inputMode="numeric"
              required
              maxLength={10}
            />
          </FormField>
          {idReady ? (
            person.isLoading ? (
              <p className="text-sm text-ink-500">{t('common.loading')}</p>
            ) : person.data ? (
              <div className={`grid items-start gap-4 ${visibleCases.length ? 'lg:grid-cols-3' : ''}`}>
                <PersonCard person={person.data} locale={locale} wide={!visibleCases.length} />
                {visibleCases.length ? (
                  <section className="min-w-0 rounded-3xl border border-teal-100 bg-white p-4 shadow-[0_8px_22px_rgba(46,189,182,0.08)] sm:p-5 lg:col-span-2">
                    <FormSectionTitle icon={Files} className="mb-4">
                      {t('violations.casesTitle')}
                      {!focusLinkedCase && cases.length > 1 ? (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                          {formatNumber(cases.length, locale)}
                        </span>
                      ) : null}
                    </FormSectionTitle>
                    <ul className="space-y-3">
                      {visibleCases.map((item) => (
                        <CaseLicenseCard
                          key={item.id}
                          item={item}
                          locale={locale}
                          omitCurrent={Boolean(currentViolationId) && item.id === linkedCaseId}
                          selected={caseUserId === item.id}
                          onSelect={() => setCaseUserId(caseUserId === item.id ? '' : item.id)}
                          onShowHistory={() => setHistoryCase(item)}
                        />
                      ))}
                    </ul>
                    {linkedCase && cases.length > 1 ? (
                      <div className="mt-3 flex">
                        <Button
                          type="button"
                          variant="ghost"
                          className="ms-auto"
                          onClick={() => setShowOtherCases((current) => !current)}
                        >
                          <Folders className="size-4" aria-hidden />
                          {t(showOtherCases ? 'violations.hideOtherCases' : 'violations.viewOtherCases')}
                        </Button>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </div>
            ) : null
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField icon={Tag} label={t('violations.violationType')} htmlFor="violationTypeId">
              <SearchSelect
                id="violationTypeId"
                value={violationTypeId}
                onChange={setViolationTypeId}
                required
                placeholder={t('violations.violationTypePlaceholder')}
                options={orderedTypes.map((item) => ({ value: item.id, label: item.title }))}
              />
            </FormField>
            <FormField icon={CalendarDays} label={t('violations.occurredAt')} htmlFor="violationDate">
              <PersianDateField id="violationDate" value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
              <input className="sr-only" tabIndex={-1} value={occurredAt} required onChange={() => undefined} />
            </FormField>
          </div>
          {initial ? (
            <FormField icon={ShieldAlert} label={t('violations.status')}>
              <div role="radiogroup" aria-label={t('violations.status')} className="flex flex-wrap gap-2">
                {VIOLATION_STATUSES.map((item) => {
                  const selected = status === item
                  return (
                    <button
                      key={item}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setStatus(item)}
                      className={`min-w-[7.25rem] flex-1 cursor-pointer rounded-2xl border px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                        selected
                          ? 'border-transparent bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white shadow-[0_8px_18px_rgba(46,189,182,0.28)]'
                          : 'border-teal-200 bg-white text-ink-700 shadow-sm hover:border-teal-400 hover:bg-teal-50'
                      }`}
                    >
                      {t(`violationStatuses.${item}`)}
                    </button>
                  )
                })}
              </div>
            </FormField>
          ) : null}
          <FormField icon={FileText} label={t('violations.description')} htmlFor="violationDescription">
            <DescriptionDictation
              value={description}
              onChange={setDescription}
              maxLength={4000}
              blocked={recording}
              onListeningChange={setDictating}
            />
            <textarea
              id="violationDescription"
              className={fieldClassName}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={10}
              maxLength={4000}
              placeholder={otherType ? t('violations.otherDescriptionPlaceholder') : undefined}
              aria-required={otherType}
            />
            {otherType ? (
              <p className="text-xs leading-6 text-ink-500">{t('violations.otherDescriptionHint')}</p>
            ) : null}
          </FormField>
          {attachmentsOpen ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="min-w-0 space-y-3">
                <FormSectionTitle icon={FileText} className="mb-3">
                  {t('violations.attachmentFile')}
                </FormSectionTitle>
                <AttachmentField
                  id="violationFiles"
                  existing={existingDocuments}
                  previewHref={attachmentPreviewHref}
                  removedIds={removedIds}
                  onToggleRemove={toggleRemove}
                  files={documentFiles}
                  onFilesChange={(next) =>
                    setFiles((current) => [...next, ...current.filter(isAudioFile)])
                  }
                />
              </section>
              <section className="min-w-0 space-y-3">
                <FormSectionTitle icon={Mic} className="mb-3">
                  {t('violations.attachmentVoice')}
                </FormSectionTitle>
                <VoiceRecorderField
                  files={audioFiles}
                  onFilesChange={(next) =>
                    setFiles((current) => [...current.filter((file) => !isAudioFile(file)), ...next])
                  }
                  onRecordingChange={setRecording}
                  existing={existingAudio.map((item) => ({
                    id: item.id,
                    href: attachmentPreviewHref?.(item.id) ?? '',
                    removed: removedIds.includes(item.id),
                  }))}
                  onToggleExisting={toggleRemove}
                  beforeStart={() => {
                    if (!dictating) return true
                    toast.error(t('violations.dictationBusy'))
                    return false
                  }}
                />
              </section>
            </div>
          ) : (
            <div className="flex">
              <Button type="button" variant="soft" className="ms-auto" onClick={() => setAttachmentsOpen(true)}>
                <Paperclip className="size-4" aria-hidden />
                {t('violations.addAttachment')}
              </Button>
            </div>
          )}
          <FormActions
            submitLabel={t('violations.save')}
            cancelLabel={t('violations.cancel')}
            submitting={saving}
            onCancel={() => history.back()}
          />
        </AppForm>
      </FormCard>
      {historyCase ? (
        <CaseViolationsModal
          caseFileId={historyCase.id}
          licenseNumber={historyCase.licenseNumber}
          excludeViolationId={currentViolationId}
          onClose={() => setHistoryCase(null)}
        />
      ) : null}
    </>
  )
}

function PersonCard({
  person,
  locale,
  wide,
}: {
  person: ViolationPersonLookup
  locale: string
  wide?: boolean
}) {
  const { t } = useTranslation()
  const certificate = person.identityCertificateNo?.trim()
  return (
    <aside className="min-w-0 rounded-3xl border border-teal-100 bg-white p-4 shadow-[0_8px_22px_rgba(46,189,182,0.08)] sm:p-5">
      <FormSectionTitle icon={UserRound}>{t('violations.personInfo')}</FormSectionTitle>
      {person.found ? (
        <div className={wide && person.photoId ? 'grid items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)]' : 'space-y-3'}>
          {person.photoId ? (
            <div className="flex justify-center rounded-2xl bg-gradient-to-b from-teal-50 to-white px-4 py-4">
              <img
                src={getImageUrl(person.photoId)}
                alt=""
                className="h-44 w-36 rounded-2xl object-cover shadow-[0_10px_24px_rgba(46,189,182,0.22)] ring-2 ring-white"
              />
            </div>
          ) : null}
          <div className={`grid gap-2 ${wide ? 'sm:grid-cols-2' : ''}`}>
            <FormFactTile
              compact
              icon={UserRound}
              label={t('violations.firstName')}
              value={person.firstName || '—'}
              empty={!person.firstName}
              tone="teal"
            />
            <FormFactTile
              compact
              icon={UserRound}
              label={t('violations.lastName')}
              value={person.lastName || '—'}
              empty={!person.lastName}
              tone="mint"
            />
            <FormFactTile
              compact
              icon={MapPin}
              label={t('violations.birthCity')}
              value={person.birthPlace || '—'}
              empty={!person.birthPlace}
              tone="teal"
            />
            <FormFactTile
              compact
              icon={BookOpen}
              label={t('violations.identityCertificateNo')}
              value={certificate ? localizeDigits(certificate, locale) : '—'}
              empty={!certificate}
              tone="mint"
            />
          </div>
        </div>
      ) : (
        <FormEmptyHint>{t('violations.personUnknown')}</FormEmptyHint>
      )}
    </aside>
  )
}

function CaseLicenseCard({
  item,
  locale,
  omitCurrent,
  selected,
  onSelect,
  onShowHistory,
}: {
  item: ViolationCaseFile
  locale: string
  omitCurrent?: boolean
  selected: boolean
  onSelect: () => void
  onShowHistory: () => void
}) {
  const { t } = useTranslation()
  const count = Math.max(0, (item.violationCount ?? 0) - (omitCurrent ? 1 : 0))
  const license = item.licenseNumber?.trim()
  return (
    <li
      className={`rounded-2xl border px-3 py-3 transition ${
        count > 0
          ? selected
            ? 'border-red-500 bg-red-50 shadow-[0_8px_18px_rgba(220,38,38,0.16)]'
            : 'border-red-400 bg-red-50/50 hover:border-red-500'
          : selected
            ? 'border-teal-400 bg-teal-50 shadow-[0_8px_18px_rgba(46,189,182,0.16)]'
            : 'border-line bg-white hover:border-teal-300'
      }`}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="flex w-full cursor-pointer items-start gap-3 text-start"
      >
        <span className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <CaseField
            icon={BadgeCheck}
            label={t('violations.licenseNumber')}
            value={license ? localizeDigits(license, locale) : '—'}
            className="sm:col-span-2"
          />
          <CaseField icon={Store} label={t('violations.caseTitle')} value={item.businessUnitTitle || '—'} />
          <CaseField icon={Layers} label={t('violations.caseJobGroup')} value={item.jobGroupTitle || '—'} />
          <CaseField icon={Briefcase} label={t('violations.caseJob')} value={item.jobTitle || '—'} className="sm:col-span-2" />
        </span>
        <span
          className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border ${
            selected ? 'border-teal-500 bg-teal-500 text-white' : 'border-teal-200 bg-white text-transparent'
          }`}
          aria-hidden
        >
          <Check className="size-3.5" />
        </span>
      </button>
      {count > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-red-100 pt-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 ring-1 ring-red-200">
            <ShieldAlert className="size-4 shrink-0" aria-hidden />
            <span className="text-xl font-bold leading-none text-red-600">{formatNumber(count, locale)}</span>
            {t('violations.priorBadge')}
          </span>
          <Button type="button" variant="ghost" onClick={onShowHistory}>
            <History className="size-4" aria-hidden />
            {t('violations.viewPrior')}
          </Button>
        </div>
      ) : null}
    </li>
  )
}

function CaseField({
  icon: Icon,
  label,
  value,
  className = '',
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <span className={`flex min-w-0 items-start gap-2.5 ${className}`}>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium text-ink-500">{label}</span>
        <span className="mt-0.5 block break-words text-sm font-semibold text-ink-900">{value}</span>
      </span>
    </span>
  )
}
