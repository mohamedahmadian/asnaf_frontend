import { BadgeCheck, IdCard, Landmark, MapPinned, RefreshCw, Settings, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { CaseGeneralSettingsPanel } from './CaseGeneralSettingsPanel'
import { CaseIdentityDocumentsPanel } from './CaseIdentityDocumentsPanel'
import { CasePlacesOfficePanel } from './CasePlacesOfficePanel'
import { CaseManagementApproversPanel } from './CaseManagementApproversPanel'
import { CaseRequirementsPanel } from './CaseRequirementsPanel'

export function CaseSettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('identity')

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Settings}
        title={t('menus.caseSettings')}
        subtitle={t('cases.settingsSubtitle')}
      />
      <FormCard icon={Settings} title={t('menus.caseSettings')}>
        <FormTabs
          value={tab}
          onChange={setTab}
          tabs={[
            {
              id: 'identity',
              label: t('cases.settingsIdentityTab'),
              icon: IdCard,
            },
            {
              id: 'places',
              label: t('cases.settingsPlacesTab'),
              icon: Landmark,
            },
            {
              id: 'management',
              label: t('cases.settingsManagementTab'),
              icon: ShieldCheck,
            },
            {
              id: 'general',
              label: t('cases.settingsGeneralTab'),
              icon: SlidersHorizontal,
            },
            {
              id: 'issuance',
              label: t('cases.settingsIssuanceTab'),
              icon: BadgeCheck,
            },
            {
              id: 'renewal',
              label: t('cases.settingsRenewalTab'),
              icon: RefreshCw,
            },
            {
              id: 'location',
              label: t('cases.settingsLocationTab'),
              icon: MapPinned,
            },
          ]}
        />
        <div
          role="tabpanel"
          id={`form-panel-${tab}`}
          aria-labelledby={`form-tab-${tab}`}
          className="space-y-4 p-5 sm:p-6"
        >
          {tab === 'general' ? <CaseGeneralSettingsPanel /> : null}
          {tab === 'identity' ? <CaseIdentityDocumentsPanel /> : null}
          {tab === 'places' ? <CasePlacesOfficePanel /> : null}
          {tab === 'management' ? <CaseManagementApproversPanel /> : null}
          {tab === 'issuance' ? <CaseRequirementsPanel requestType="ISSUANCE" /> : null}
          {tab === 'renewal' ? <CaseRequirementsPanel requestType="RENEWAL" /> : null}
          {tab === 'location' ? <CaseRequirementsPanel requestType="LOCATION_CHANGE" /> : null}
        </div>
      </FormCard>
    </div>
  )
}
