import { Printer, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Form'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { presentInquiryLetter, printInquiryLetter } from './inquiry-api'
import { LetterIssueBar, useEditableLetter, useInquiryLetterMarkup, useLetterPaper } from './LetterIssueBar'
import type { CaseInquiryLetter } from './inquiry-types'

const printButtonClassName = 'min-w-40 px-8 disabled:opacity-60'

export function InquiryLetterModal({
  inquiryId,
  locale,
  onClose,
  letterUrl,
  preview,
}: {
  inquiryId?: string
  locale: string
  onClose: () => void
  letterUrl?: string
  preview?: {
    letter: CaseInquiryLetter | undefined
    loading: boolean
    error: unknown
  }
}) {
  const { t } = useTranslation()
  const remoteUrl = preview ? '' : (letterUrl ?? `/cases/inquiries/${inquiryId}/letter`)
  const query = useQuery({
    queryKey: ['cases', 'inquiry-letter', remoteUrl],
    enabled: !preview && Boolean(remoteUrl),
    queryFn: async () => (await api.get<CaseInquiryLetter>(remoteUrl)).data,
  })
  const queryKey = ['cases', 'inquiry-letter', remoteUrl] as const
  const source = preview ? preview.letter : query.data
  const loading = preview ? preview.loading : query.isLoading
  const failed = preview ? preview.error : query.isError ? query.error : null
  const [paper, setPaper] = useLetterPaper(source)
  const issue = useEditableLetter(source, preview ? null : remoteUrl, queryKey)
  const fragment = useInquiryLetterMarkup(issue.view, locale, paper)
  const filled = useMemo(
    () => (issue.view ? presentInquiryLetter(issue.view, locale) : null),
    [issue.view, locale],
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/30 p-4"
      data-nested-dialog
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={filled?.title || t('cases.inquiryPrint')}
        className="relative z-10 flex max-h-[min(52rem,92dvh)] w-full max-w-[230mm] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <div className="flex justify-end px-3 pt-3">
          <Button type="button" variant="ghost" icon onClick={onClose} aria-label={t('common.close')}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 sm:px-10">
          {loading ? <LoadingState variant="inline" /> : null}
          {failed ? (
            <p className="text-sm text-red-700">{getApiErrorMessage(failed, t('cases.saveFailed'))}</p>
          ) : null}
          {source ? (
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
                className="mx-auto w-fit rounded-2xl bg-white shadow-[0_8px_28px_rgba(20,40,40,0.06)]"
                dangerouslySetInnerHTML={{ __html: fragment }}
              />
            </div>
          ) : null}
        </div>
        <div className="flex justify-center border-t border-teal-100 px-4 py-4">
          <Button
            type="button"
            className={printButtonClassName}
            disabled={!filled}
            onClick={() => {
              void issue.persist().then((saved) => {
                if (saved) void printInquiryLetter(saved, locale, paper)
              })
            }}
          >
            <Printer className="size-4" aria-hidden />
            {t('cases.inquiryPrint')}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
