import { Download, Printer, ScanSearch } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'
import { Button, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { downloadInquiryLetter, inquiryLetterFilename, presentInquiryLetter } from './inquiry-api'
import type { CaseInquiryLetter } from './inquiry-types'

export function CaseInquiryLetterPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useQuery({
    queryKey: ['cases', 'inquiry-letter', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<CaseInquiryLetter>(`/cases/inquiries/${id}/letter`)).data,
  })
  const letter = query.data
  const filled = useMemo(() => (letter ? presentInquiryLetter(letter, locale) : null), [letter, locale])

  function download() {
    if (!filled || !letter) return
    downloadInquiryLetter(inquiryLetterFilename(letter.centerName), filled.title, filled.body)
  }

  return (
    <div className={caseShellClassName}>
      <div className="print:hidden">
        <PageHeader
          icon={ScanSearch}
          title={t('cases.inquiryLetter')}
          subtitle={letter?.centerName}
          backTo={
            location.pathname.startsWith('/cases/formation')
              ? letter?.nationalId
                ? `/cases/formation?nationalId=${encodeURIComponent(letter.nationalId)}`
                : '/cases/formation'
              : `/cases/inquiries/${id}`
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => window.print()}>
                <Printer className="size-4" aria-hidden />
                {t('cases.inquiryPrint')}
              </Button>
              <Button type="button" variant="ghost" onClick={download} disabled={!filled}>
                <Download className="size-4" aria-hidden />
                {t('cases.inquiryDownload')}
              </Button>
            </div>
          }
        />
      </div>
      {query.isLoading ? <LoadingState /> : null}
      {filled ? (
        <FormCard icon={ScanSearch} title={filled.title}>
          <div className={`${formCardBodyClassName} whitespace-pre-wrap text-sm leading-8 text-ink-900`}>
            {filled.body}
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}
