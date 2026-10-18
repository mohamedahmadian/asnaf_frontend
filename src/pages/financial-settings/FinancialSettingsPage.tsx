import {
  BadgeCheck,
  Banknote,
  Gavel,
  Landmark,
  MapPinned,
  RefreshCw,
  UserRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckboxField } from '../../components/ui/CheckboxField'
import {
  AppForm,
  FormActions,
  FormField,
  PageHeader,
  formShellClassName,
} from '../../components/ui/Form'
import {
  FormCard,
  FormEmptyHint,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { confirmToast } from '../../components/ui/confirmToast'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber } from '../../lib/datetime'
import type { FinancialProcessType } from '../../types/app'
import { bankAccountOptionLabel, defaultBankAccountId } from '../municipal-fees/MunicipalFeeForm'

type Account = {
  id: string
  bankName: string
  accountNumber: string
  isActive: boolean
  isDefault: boolean
}

type Fee = {
  id: string
  title: string
  amount: number
  bankAccountId: string
  isActive: boolean
  processTypes: FinancialProcessType[]
}

type RequestSetting = {
  requestType: FinancialProcessType
  bankAccountId: string | null
  feeIds: string[]
}

type FinancialSettingsData = {
  accounts: Account[]
  fees: Fee[]
  settings: RequestSetting[]
}

const requestTabs: {
  id: string
  requestType: FinancialProcessType
  labelKey: string
  icon: LucideIcon
}[] = [
  { id: 'issuance', requestType: 'ISSUANCE', labelKey: 'financialSettings.tabs.ISSUANCE', icon: BadgeCheck },
  { id: 'renewal', requestType: 'RENEWAL', labelKey: 'financialSettings.tabs.RENEWAL', icon: RefreshCw },
  { id: 'location', requestType: 'LOCATION_CHANGE', labelKey: 'financialSettings.tabs.LOCATION_CHANGE', icon: MapPinned },
  { id: 'auction', requestType: 'AUCTION', labelKey: 'financialSettings.tabs.AUCTION', icon: Gavel },
  { id: 'stewardship', requestType: 'STEWARDSHIP', labelKey: 'financialSettings.tabs.STEWARDSHIP', icon: UserRound },
]

function FinancialRequestPanel({
  setting,
  accounts,
  fees,
}: {
  setting: RequestSetting
  accounts: Account[]
  fees: Fee[]
}) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const initialAccountId = setting.bankAccountId ?? defaultBankAccountId(accounts)
  const initialFeeIds = setting.bankAccountId
    ? setting.feeIds
    : setting.feeIds.filter(
        (id) => fees.find((fee) => fee.id === id)?.bankAccountId === initialAccountId,
      )
  const [bankAccountId, setBankAccountId] = useState(initialAccountId)
  const [feeIds, setFeeIds] = useState<string[]>(initialFeeIds)
  const [saving, setSaving] = useState(false)

  const accountOptions = useMemo(
    () =>
      accounts
        .filter((account) => account.isActive || account.id === setting.bankAccountId)
        .map((account) => ({
          value: account.id,
          label: bankAccountOptionLabel(
            account,
            locale,
            t('geo.inactive'),
            t('bankAccounts.defaultBadge'),
          ),
        })),
    [accounts, locale, setting.bankAccountId, t],
  )

  const accountFees = useMemo(
    () =>
      fees.filter(
        (fee) =>
          fee.bankAccountId === bankAccountId &&
          (fee.isActive || feeIds.includes(fee.id)),
      ),
    [bankAccountId, feeIds, fees],
  )

  function applyAccount(nextAccountId: string) {
    setBankAccountId(nextAccountId)
    setFeeIds(
      fees
        .filter((fee) => fee.bankAccountId === nextAccountId && fee.isActive)
        .map((fee) => fee.id),
    )
  }

  function changeAccount(nextAccountId: string) {
    if (!nextAccountId || nextAccountId === bankAccountId) return
    if (setting.bankAccountId && nextAccountId !== setting.bankAccountId) {
      confirmToast({
        title: t('financialSettings.changeAccountConfirm'),
        confirmLabel: t('financialSettings.replaceFees'),
        cancelLabel: t('common.cancel'),
        onConfirm: () => applyAccount(nextAccountId),
      })
      return
    }
    applyAccount(nextAccountId)
  }

  function reset() {
    setBankAccountId(initialAccountId)
    setFeeIds(initialFeeIds)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!bankAccountId) return
    setSaving(true)
    try {
      await api.put(`/financial-settings/${setting.requestType}`, {
        bankAccountId,
        feeIds,
      })
      await queryClient.invalidateQueries({ queryKey: ['financial-settings'] })
      toast.success(t('financialSettings.saved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppForm onSubmit={submit} className={formCardBodyClassName}>
      <FormField
        icon={Landmark}
        label={t('financialSettings.bankAccount')}
        htmlFor={`financial-account-${setting.requestType}`}
      >
        <SearchSelect
          id={`financial-account-${setting.requestType}`}
          value={bankAccountId}
          onChange={changeAccount}
          placeholder={t('financialSettings.selectBankAccount')}
          required
          options={accountOptions}
        />
      </FormField>

      <div className="space-y-3 border-t border-teal-100 pt-5">
        <FormSectionTitle icon={Banknote}>{t('financialSettings.fees')}</FormSectionTitle>
        {!bankAccountId ? (
          <FormEmptyHint>{t('financialSettings.selectAccountFirst')}</FormEmptyHint>
        ) : accountFees.length === 0 ? (
          <FormEmptyHint>{t('financialSettings.noFeesForAccount')}</FormEmptyHint>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {accountFees.map((fee) => (
              <CheckboxField
                key={fee.id}
                id={`financial-fee-${setting.requestType}-${fee.id}`}
                checked={feeIds.includes(fee.id)}
                label={
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate">
                      {fee.title}
                      {!fee.isActive ? ` (${t('geo.inactive')})` : ''}
                    </span>
                    <span className="shrink-0 text-xs text-ink-500">
                      {formatGroupedNumber(fee.amount, locale)}
                    </span>
                  </span>
                }
                onChange={(checked) =>
                  setFeeIds((current) =>
                    checked
                      ? [...current, fee.id]
                      : current.filter((id) => id !== fee.id),
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      <FormActions
        submitLabel={t('financialSettings.save')}
        cancelLabel={t('common.cancel')}
        submitting={saving}
        onCancel={reset}
        headerIcons={false}
      />
    </AppForm>
  )
}

export function FinancialSettingsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab = requestTabs.some((item) => item.id === requestedTab)
    ? requestedTab!
    : requestTabs[0].id
  const activeDefinition =
    requestTabs.find((item) => item.id === activeTab) ?? requestTabs[0]
  const query = useQuery({
    queryKey: ['financial-settings'],
    queryFn: async () => {
      const { data } = await api.get<FinancialSettingsData>('/financial-settings')
      return data
    },
  })

  function selectTab(next: string) {
    const nextParams = new URLSearchParams(searchParams)
    if (next === requestTabs[0].id) nextParams.delete('tab')
    else nextParams.set('tab', next)
    setSearchParams(nextParams, { replace: true })
  }

  const setting = query.data?.settings.find(
    (item) => item.requestType === activeDefinition.requestType,
  )

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={WalletCards}
        title={t('menus.financialSettings')}
        subtitle={t('financialSettings.subtitle')}
      />
      <FormCard icon={WalletCards} title={t('menus.financialSettings')}>
        <FormTabs
          value={activeTab}
          onChange={selectTab}
          tabs={requestTabs.map((item) => ({
            id: item.id,
            label: t(item.labelKey),
            icon: item.icon,
          }))}
        />
        <div
          role="tabpanel"
          id={`form-panel-${activeTab}`}
          aria-labelledby={`form-tab-${activeTab}`}
        >
          {query.isPending ? (
            <div className="p-5 text-sm text-ink-500 sm:p-6">{t('common.loading')}</div>
          ) : query.isError || !query.data || !setting ? (
            <div className="p-5 text-sm text-red-700 sm:p-6">{t('common.error')}</div>
          ) : (
            <FinancialRequestPanel
              key={setting.requestType}
              setting={setting}
              accounts={query.data.accounts}
              fees={query.data.fees}
            />
          )}
        </div>
      </FormCard>
    </div>
  )
}
