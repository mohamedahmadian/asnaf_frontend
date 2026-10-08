import { BadgeCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { PageHeader, caseShellClassName } from '../../components/ui/Form'
import { ActivityLicensePanel } from './ActivityLicensePanel'

export function CaseLicensePage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  return (
    <div className={caseShellClassName}>
      <div className="print:hidden">
        <PageHeader icon={BadgeCheck} title={t('cases.licenseTitle')} backTo={`/cases/${id}`} />
      </div>
      <ActivityLicensePanel caseId={id} />
    </div>
  )
}
