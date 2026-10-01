import { IdCard, Settings } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { CaseIdentityDocumentsPanel } from './CaseIdentityDocumentsPanel'

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
          ]}
        />
        <div
          role="tabpanel"
          id="form-panel-identity"
          aria-labelledby="form-tab-identity"
          className="space-y-4 p-5 sm:p-6"
        >
          {tab === 'identity' ? <CaseIdentityDocumentsPanel /> : null}
        </div>
      </FormCard>
    </div>
  )
}
