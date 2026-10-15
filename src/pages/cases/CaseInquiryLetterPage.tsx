import { Download, Landmark, Printer, ScanSearch } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'
import { Button, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { LetterIssueBar, useEditableLetter, useInquiryLetterMarkup, useLetterPaper } from './LetterIssueBar'
import { downloadInquiryLetter, inquiryLetterFilename, printInquiryLetter } from './inquiry-api'
import type { CaseInquiryLetter } from './inquiry-types'

export function CaseInquiryLetterPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const places = location.pathname.includes('/places/')
  const apiBase = places ? '/cases/places' : '/cases/inquiries'
  const PageIcon = places ? Landmark : ScanSearch
  const queryKey = ['cases', 'inquiry-letter', apiBase, id] as const
  const query = useQuery({
    queryKey,
    enabled: Boolean(id),
    queryFn: async () => (await api.get<CaseInquiryLetter>(`${apiBase}/${id}/letter`)).data,
  })
  const letter = query.data
  const [paper, setPaper] = useLetterPaper(letter)
  const issue = useEditableLetter(letter, `${apiBase}/${id}/letter`, queryKey)
  const fragment = useInquiryLetterMarkup(issue.view, locale, paper)

  async function download() {
    const saved = await issue.persist()
    if (!saved) return
    await downloadInquiryLetter(inquiryLetterFilename(saved.centerName), saved, locale, paper)
  }

  async function print() {
    const saved = await issue.persist()
    if (!saved) return
    await printInquiryLetter(saved, locale, paper)
  }

  return (
    <div className={caseShellClassName}>
      <div className="print:hidden">
        <PageHeader
          icon={PageIcon}
          title={t('cases.inquiryLetter')}
          subtitle={letter?.centerName}
          backTo={
            location.pathname.startsWith('/cases/formation')
              ? letter?.nationalId
                ? `/cases/formation?nationalId=${encodeURIComponent(letter.nationalId)}`
                : '/cases/formation'
              : `${apiBase}/${id}`
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void print()} disabled={!letter}>
                <Printer className="size-4" aria-hidden />
                {t('cases.inquiryPrint')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => void download()} disabled={!letter}>
                <Download className="size-4" aria-hidden />
                {t('cases.inquiryDownload')}
              </Button>
            </div>
          }
        />
      </div>
      {query.isLoading ? <LoadingState /> : null}
      {letter ? (
        <LetterIssueBar
          letterNo={issue.letterNo}
          issuedAt={issue.issuedAt}
          paper={paper}
          onPaperChange={setPaper}
          onLetterNoChange={issue.setLetterNo}
          onIssuedAtChange={(value) => {
            issue.setIssuedAt(value)
            if (value) void issue.persist({ issuedAt: value })
          }}
          onLetterNoCommit={() => void issue.persist()}
        />
      ) : null}
      {fragment ? (
        <div className="w-full overflow-x-auto">
          <div
            className="mx-auto w-fit rounded-2xl bg-white shadow-[0_8px_28px_rgba(20,40,40,0.06)] print:rounded-none print:shadow-none"
            dangerouslySetInnerHTML={{ __html: fragment }}
          />
        </div>
      ) : null}
    </div>
  )
}
