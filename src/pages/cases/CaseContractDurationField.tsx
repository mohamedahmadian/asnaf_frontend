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
}

export function CaseContractDurationField() {
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
    if (!Number.isInteger(years) || years === query.data.contractYears) return
    setSaving(true)
    try {
      const { data } = await api.put<GeneralSettings>('/cases/settings/general', {
        editAfterIssuance: query.data.editAfterIssuance,
        editorRoleId: query.data.editorRoleId,
        contractYears: years,
      })
      queryClient.setQueryData(['cases', 'general-settings'], data)
      toast.success(t('cases.contractDurationSaved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  if (query.isLoading) return <LoadingState variant="inline" />
  if (!query.data) return <p className="text-sm text-red-700">{t('common.error')}</p>

  const years = query.data.contractYears || 1

  return (
    <div className="max-w-sm space-y-2">
      <FormField icon={CalendarClock} label={t('cases.contractDuration')} htmlFor="case-contract-years">
        <SearchSelect
          id="case-contract-years"
          value={String(years)}
          onChange={(value) => void onChange(value)}
          options={CONTRACT_YEARS.map((year) => ({
            value: String(year),
            label: t('cases.contractDurationOption', { count: formatNumber(year, i18n.language) }),
          }))}
          placeholder={t('cases.contractDuration')}
          disabled={saving}
        />
      </FormField>
      <p className="text-sm leading-7 text-ink-500">{t('cases.contractDurationHint')}</p>
    </div>
  )
}
