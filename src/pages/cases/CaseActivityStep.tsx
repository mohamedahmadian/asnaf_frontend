import { Briefcase, Building2, CreditCard, FolderKanban, History, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppForm, FormField, inputClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import type { Job, JobGroup } from '../../types/app'
import { PREVIOUS_OCCUPATIONS } from './formation-types'

export function CaseActivityStep({
  unitTitle,
  groupId,
  jobId,
  previousOccupation,
  posCount,
  groups,
  jobs,
  onUnitTitleChange,
  onGroupChange,
  onJobChange,
  onPreviousOccupationChange,
  onPosCountChange,
  onSubmit,
}: {
  unitTitle: string
  groupId: string
  jobId: string
  previousOccupation: string
  posCount: string
  groups: JobGroup[]
  jobs: Job[]
  onUnitTitleChange: (value: string) => void
  onGroupChange: (value: string) => void
  onJobChange: (value: string) => void
  onPreviousOccupationChange: (value: string) => void
  onPosCountChange: (value: string) => void
  onSubmit: () => void
}) {
  const { t } = useTranslation()
  const jobOptions = groupId ? jobs.filter((item) => item.groupId === groupId) : jobs
  const selected = jobs.find((item) => item.id === jobId)

  return (
    <AppForm
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <FormField icon={Building2} label={t('cases.unitTitle')} htmlFor="case-unit-title">
        <input
          id="case-unit-title"
          required
          className={inputClassName()}
          value={unitTitle}
          onChange={(event) => onUnitTitleChange(event.target.value)}
        />
      </FormField>
      <FormField icon={FolderKanban} label={t('cases.activityGroup')} htmlFor="case-activity-group">
        <SearchSelect
          id="case-activity-group"
          value={groupId}
          onChange={(value) => {
            onGroupChange(value)
            const current = jobs.find((item) => item.id === jobId)
            if (current?.groupId && current.groupId !== value) onJobChange('')
          }}
          placeholder={t('users.selectOptional')}
          options={[
            { value: '', label: t('users.selectOptional') },
            ...groups.map((group) => ({ value: group.id, label: group.title })),
          ]}
        />
      </FormField>
      <FormField icon={Briefcase} label={t('cases.activityJob')} htmlFor="case-activity-job">
        <SearchSelect
          id="case-activity-job"
          value={jobId}
          onChange={(value) => {
            onJobChange(value)
            const next = jobs.find((item) => item.id === value)
            if (next?.groupId) onGroupChange(next.groupId)
          }}
          placeholder={t('users.selectOptional')}
          options={[
            { value: '', label: t('users.selectOptional') },
            ...jobOptions.map((job) => ({ value: job.id, label: job.title })),
          ]}
        />
      </FormField>
      <FormField icon={Layers} label={t('cases.activityType')} htmlFor="case-activity-type">
        <input
          id="case-activity-type"
          readOnly
          tabIndex={-1}
          className={inputClassName()}
          value={selected?.jobType?.title ?? ''}
        />
      </FormField>
      <FormField icon={History} label={t('cases.previousJob')} htmlFor="case-previous-job">
        <SearchSelect
          id="case-previous-job"
          value={previousOccupation}
          onChange={onPreviousOccupationChange}
          placeholder={t('users.selectOptional')}
          options={[
            { value: '', label: t('users.selectOptional') },
            ...PREVIOUS_OCCUPATIONS.map((item) => ({
              value: item,
              label: t(`cases.previousOccupations.${item}`),
            })),
          ]}
        />
      </FormField>
      <FormField icon={CreditCard} label={t('cases.posCount')} htmlFor="case-pos-count">
        <input
          id="case-pos-count"
          type="number"
          min={0}
          max={999}
          inputMode="numeric"
          className={`${inputClassName()} digit-field`}
          value={posCount}
          onChange={(event) => onPosCountChange(event.target.value)}
        />
      </FormField>
    </AppForm>
  )
}
