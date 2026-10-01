import { CalendarDays, FileText, Files, IdCard, ShieldAlert, Tag } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import {
  AppForm,
  FormActions,
  FormField,
  fieldClassName,
} from '../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { isValidIranianNationalId, normalizeNationalId } from '../../lib/national-id'
import type { ViolationAttachment, ViolationCaseFile, ViolationStatus, ViolationType } from '../../types/app'
import { FORMATION_STEPS } from '../cases/formation-types'
import { AttachmentField } from './AttachmentField'
import { VIOLATION_STATUSES } from './constants'

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

export function ViolationForm({
  initial,
  onSubmit,
}: {
  initial?: ViolationFormValue
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
  const [nationalId, setNationalId] = useState(initial?.nationalId ?? '')
  const [violationTypeId, setViolationTypeId] = useState(initial?.violationTypeId ?? '')
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<ViolationStatus>(initial?.status ?? 'REGISTERED')
  const [caseUserId, setCaseUserId] = useState(initial?.caseUserId ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
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
      (
        await api.get<{ nationalId: string; fullName: string | null; cases: ViolationCaseFile[] }>(
          '/violations/person',
          { params: { nationalId: normalizedId } },
        )
      ).data,
  })
  const cases = person.data?.cases ?? []

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

  const typeOptions = (types.data ?? []).filter(
    (item) => item.isActive || item.id === violationTypeId,
  )
  const displayName = person.data?.fullName || initial?.personName || normalizedId

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
          {idReady && person.data ? (
            <p className="text-sm text-ink-600">
              {person.data.fullName || t('violations.personUnknown')}
            </p>
          ) : null}
        </FormField>
        <FormField icon={Files} label={t('violations.caseFile')} htmlFor="violationCase">
          {!idReady ? (
            <p className="text-sm text-ink-500">{t('violations.caseOptional')}</p>
          ) : person.isLoading ? null : cases.length ? (
            <div className="space-y-2">
              <ul className="space-y-2">
                {cases.map((item) => {
                  const selected = caseUserId === item.id
                  const stepKey = FORMATION_STEPS[item.formationStep]
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setCaseUserId(selected ? '' : item.id)}
                        className={`w-full cursor-pointer rounded-2xl border px-3 py-3 text-start transition ${
                          selected
                            ? 'border-teal-400 bg-teal-50 shadow-[0_8px_18px_rgba(46,189,182,0.16)]'
                            : 'border-line bg-white hover:border-teal-300'
                        }`}
                      >
                        <span className="block text-sm font-medium text-ink-900">
                          {item.caseTrackingCode
                            ? localizeDigits(item.caseTrackingCode, locale)
                            : t('violations.caseNoCode')}
                        </span>
                        <span className="mt-1 block text-xs text-ink-500">
                          {[
                            item.businessUnitTitle,
                            item.jobTitle,
                            stepKey ? t(`cases.steps.${stepKey}`) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || item.fullName}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-ink-500">{t('violations.caseOptional')}</p>
            </div>
          ) : (
            <FormEmptyHint>{t('violations.caseEmpty')}</FormEmptyHint>
          )}
        </FormField>
        <FormField icon={Tag} label={t('violations.violationType')} htmlFor="violationTypeId">
          <SearchSelect
            id="violationTypeId"
            value={violationTypeId}
            onChange={setViolationTypeId}
            required
            placeholder={t('violations.violationTypePlaceholder')}
            options={typeOptions.map((item) => ({ value: item.id, label: item.title }))}
          />
        </FormField>
        <FormField icon={CalendarDays} label={t('violations.occurredAt')} htmlFor="violationDate">
          <PersianDateField id="violationDate" value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
          <input className="sr-only" tabIndex={-1} value={occurredAt} required onChange={() => undefined} />
        </FormField>
        <FormField icon={ShieldAlert} label={t('violations.status')} htmlFor="violationStatus">
          <SearchSelect
            id="violationStatus"
            value={status}
            onChange={(value) => setStatus((value || 'REGISTERED') as ViolationStatus)}
            required
            placeholder={t('violations.statusPlaceholder')}
            options={VIOLATION_STATUSES.map((item) => ({
              value: item,
              label: t(`violationStatuses.${item}`),
            }))}
          />
        </FormField>
        <FormField icon={FileText} label={t('violations.description')} htmlFor="violationDescription">
          <textarea
            id="violationDescription"
            className={fieldClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={4000}
          />
        </FormField>
        <FormField icon={FileText} label={t('violations.attachments')} htmlFor="violationFiles">
          <AttachmentField
            id="violationFiles"
            existing={initial?.attachments}
            removedIds={removedIds}
            onToggleRemove={(attachmentId) =>
              setRemovedIds((current) =>
                current.includes(attachmentId)
                  ? current.filter((item) => item !== attachmentId)
                  : [...current, attachmentId],
              )
            }
            files={files}
            onFilesChange={setFiles}
          />
        </FormField>
        <FormActions
          submitLabel={t('violations.save')}
          cancelLabel={t('violations.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
