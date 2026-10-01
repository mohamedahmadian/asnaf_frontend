import { ChartColumn } from 'lucide-react'
import { CaseSectionPage } from './CaseSectionPage'

export function CaseReportsPage() {
  return (
    <CaseSectionPage
      icon={ChartColumn}
      titleKey="menus.caseReports"
      subtitleKey="cases.reportsSubtitle"
      emptyKey="cases.reportsEmpty"
    />
  )
}
