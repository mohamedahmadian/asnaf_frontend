import { CalendarClock } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FormField, LoadingState } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'

const CONTRACT_YEARS = [1, 2, 3, 4, 5] as const

type GeneralSettings = {
  editAfterIssuance: boolean
  editorRoleId: string | null
  contractYears: number
  stewardContractYears: number
}

export function CaseContractDurationField({ scope = 'license' }: { scope?: 'license' | 'steward' }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const query = useQuery({
    queryKey: ['cases', 'general-settings'],
    queryFn: async () => (await api.get<GeneralSettings>('/cases/settings/general')).data,
  })

  async function onChange(value: string) {
    if (!query.data) return
    const years = Number(value)
    const current = scope === 'steward' ? query.data.stewardContractYears : query.data.contractYears
    if (!Number.isInteger(years) || years === current) return
    setSaving(true)
    try {
      const { data } = await api.put<GeneralSettings>('/cases/settings/general', {
        editAfterIssuance: query.data.editAfterIssuance,
        editorRoleId: query.data.editorRoleId,
        ...(scope === 'steward' ? { stewardContractYears: years } : { contractYears: years }),
      })
      queryClient.setQueryData(['cases', 'general-settings'], data)
      toast.success(t(scope === 'steward' ? 'cases.cardValidityDurationSaved' : 'cases.contractDurationSaved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  if (query.isLoading) return <LoadingState variant="inline" />
  if (!query.data) return <p className="text-sm text-red-700">{t('common.error')}</p>

  const years = (scope === 'steward' ? query.data.stewardContractYears : query.data.contractYears) || 1
  const fieldId = scope === 'steward' ? 'case-steward-contract-years' : 'case-contract-years'
  const label = t(scope === 'steward' ? 'cases.cardValidityDuration' : 'cases.contractDuration')

  return (
    <div className="w-full">
      <FormField icon={CalendarClock} label={label} htmlFor={fieldId}>
        <SearchSelect
          id={fieldId}
          value={String(years)}
          onChange={(value) => void onChange(value)}
          options={CONTRACT_YEARS.map((year) => ({
            value: String(year),
            label: t('cases.contractDurationOption', { count: formatNumber(year, i18n.language) }),
          }))}
          placeholder={label}
          disabled={saving}
        />
      </FormField>
    </div>
  )
}
