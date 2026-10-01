import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormEmptyHint } from '../../components/ui/FormLayout'

export function CaseSectionPage({
  icon,
  titleKey,
  subtitleKey,
  emptyKey,
}: {
  icon: LucideIcon
  titleKey: string
  subtitleKey: string
  emptyKey: string
}) {
  const { t } = useTranslation()

  return (
    <div className={caseShellClassName}>
      <PageHeader icon={icon} title={t(titleKey)} subtitle={t(subtitleKey)} />
      <FormEmptyHint>{t(emptyKey)}</FormEmptyHint>
    </div>
  )
}
