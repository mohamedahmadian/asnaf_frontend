import { Download, Printer, ScanSearch } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'
import { Button, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { formatDate, localizeDigits } from '../../lib/datetime'
import { fillInquiryLetter } from './inquiry-api'
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
  const filled = useMemo(() => {
    if (!letter) return null
    const fields = {
      ...letter.fields,
      date: letter.fields.date ? formatDate(letter.fields.date, locale) : '',
      nationalId: localizeDigits(letter.fields.nationalId ?? '', locale),
      trackingCode: localizeDigits(letter.fields.trackingCode ?? '', locale),
      phone: localizeDigits(letter.fields.phone ?? '', locale),
    }
    return {
      title: fillInquiryLetter(letter.letterTitle, fields),
      body: fillInquiryLetter(letter.letterBody, fields),
    }
  }, [letter, locale])

  function download() {
    if (!filled || !letter) return
    const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(filled.title)}</title></head><body style="font-family:Tahoma,sans-serif;white-space:pre-wrap;line-height:1.9">${escapeHtml(filled.body)}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${letter.centerName}.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={caseShellClassName}>
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
          <div className="flex flex-wrap gap-2 print:hidden">
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
