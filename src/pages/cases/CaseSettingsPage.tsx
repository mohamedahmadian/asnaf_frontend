import { BadgeCheck, FileSignature, FileText, Gavel, IdCard, Landmark, MapPinned, RefreshCw, ScanSearch, Settings, Shield, SlidersHorizontal, UserRound, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { FormTabs, type FormTabItem } from '../../components/ui/FormTabs'
import { CaseContractDurationField } from './CaseContractDurationField'
import { CaseGeneralSettingsPanel } from './CaseGeneralSettingsPanel'
import { CaseLetterheadPanel } from './CaseLetterheadPanel'
import { CaseIdentityDocumentsPanel } from './CaseIdentityDocumentsPanel'
import { CasePlacesOfficePanel } from './CasePlacesOfficePanel'
import { CaseProcessManagementRolesPanel } from './CaseProcessManagementRolesPanel'
import { CaseRequirementsPanel } from './CaseRequirementsPanel'

type RequestType = 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'AUCTION' | 'STEWARDSHIP'

function RequestSettings({
  requestType,
  includeIdentity,
  initialSection,
}: {
  requestType: RequestType
  includeIdentity?: boolean
  initialSection?: string | null
}) {
  const { t } = useTranslation()
  const [section, setSection] = useState(() => {
    if (
      initialSection === 'documents' ||
      initialSection === 'inquiries' ||
      initialSection === 'approvals' ||
      (initialSection === 'identity' && includeIdentity)
    ) {
      return initialSection
    }
    return includeIdentity ? 'identity' : 'documents'
  })
  const tabs: FormTabItem[] = [
    ...(includeIdentity
      ? [{ id: 'identity', label: t('cases.settingsIdentityTab'), icon: IdCard }]
      : []),
    { id: 'documents', label: t('cases.documentsTab'), icon: FileText },
    { id: 'inquiries', label: t('cases.steps.inquiries'), icon: ScanSearch },
    { id: 'approvals', label: t('cases.settingsProcessManagementTab'), icon: Shield },
  ]
  const showContract = requestType === 'ISSUANCE' || requestType === 'RENEWAL' || requestType === 'STEWARDSHIP'

  return (
    <div>
      {showContract ? (
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <CaseContractDurationField scope={requestType === 'STEWARDSHIP' ? 'steward' : 'license'} />
        </div>
      ) : null}
      <div className={showContract ? 'mt-5 border-t border-teal-100' : undefined}>
        <FormTabs value={section} onChange={setSection} tabs={tabs} />
        <div
          role="tabpanel"
          id={`form-panel-${section}`}
          aria-labelledby={`form-tab-${section}`}
          className="space-y-4 px-5 py-5 sm:px-6"
        >
          {section === 'identity' ? <CaseIdentityDocumentsPanel /> : null}
          {section === 'documents' ? (
            <CaseRequirementsPanel requestType={requestType} section="documents" />
          ) : null}
          {section === 'inquiries' ? (
            <CaseRequirementsPanel requestType={requestType} section="inquiries" />
          ) : null}
          {section === 'approvals' ? <CaseProcessManagementRolesPanel requestType={requestType} /> : null}
        </div>
      </div>
    </div>
  )
}

export function CaseSettingsPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const requestedSection = searchParams.get('section')
  const tabs: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'issuance', label: t('cases.settingsIssuanceTab'), icon: BadgeCheck },
    { id: 'renewal', label: t('cases.settingsRenewalTab'), icon: RefreshCw },
    { id: 'location', label: t('cases.settingsLocationTab'), icon: MapPinned },
    { id: 'auction', label: t('cases.settingsAuctionTab'), icon: Gavel },
    { id: 'stewardship', label: t('cases.settingsStewardshipTab'), icon: UserRound },
    { id: 'places', label: t('cases.settingsPlacesTab'), icon: Landmark },
    { id: 'letterhead', label: t('cases.settingsLetterheadTab'), icon: FileSignature },
    { id: 'general', label: t('cases.settingsGeneralTab'), icon: SlidersHorizontal },
  ]
  const [tab, setTab] = useState(
    tabs.some((item) => item.id === requestedTab) ? requestedTab! : 'issuance',
  )
  const requestTab = tab === 'issuance' || tab === 'renewal' || tab === 'location' || tab === 'auction' || tab === 'stewardship'

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Settings}
        title={t('menus.caseSettings')}
        subtitle={t('cases.settingsSubtitle')}
      />
      <FormCard icon={Settings} title={t('menus.caseSettings')}>
        <FormTabs value={tab} onChange={setTab} tabs={tabs} />
        <div
          role="tabpanel"
          id={`form-panel-${tab}`}
          aria-labelledby={`form-tab-${tab}`}
          className={requestTab ? undefined : 'space-y-4 p-5 sm:p-6'}
        >
          {tab === 'issuance' ? (
            <RequestSettings requestType="ISSUANCE" includeIdentity initialSection={requestedSection} />
          ) : null}
          {tab === 'renewal' ? (
            <RequestSettings requestType="RENEWAL" initialSection={requestedSection} />
          ) : null}
          {tab === 'location' ? (
            <RequestSettings requestType="LOCATION_CHANGE" initialSection={requestedSection} />
          ) : null}
          {tab === 'auction' ? (
            <RequestSettings requestType="AUCTION" initialSection={requestedSection} />
          ) : null}
          {tab === 'stewardship' ? (
            <RequestSettings requestType="STEWARDSHIP" initialSection={requestedSection} />
          ) : null}
          {tab === 'places' ? <CasePlacesOfficePanel /> : null}
          {tab === 'letterhead' ? <CaseLetterheadPanel /> : null}
          {tab === 'general' ? <CaseGeneralSettingsPanel /> : null}
        </div>
      </FormCard>
    </div>
  )
}
