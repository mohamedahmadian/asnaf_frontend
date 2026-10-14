import { BadgeCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { PageHeader, caseShellClassName } from '../../components/ui/Form'
import { ActivityLicensePanel } from './ActivityLicensePanel'
import { useCaseCapabilities } from './case-capabilities'

export function CaseLicensePage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const { placesViewer, managementReviewer, issuerViewer, canIssue } = useCaseCapabilities()
  const backTo = placesViewer
    ? '/cases/places'
    : managementReviewer
      ? '/cases/management-reviews'
      : issuerViewer
        ? '/cases/issuance'
        : `/cases/${id}`
  return (
    <div className={caseShellClassName}>
      <div className="print:hidden">
        <PageHeader icon={BadgeCheck} title={t('cases.licenseTitle')} backTo={backTo} />
      </div>
      <ActivityLicensePanel caseId={id} readOnly={!canIssue} />
    </div>
  )
}
