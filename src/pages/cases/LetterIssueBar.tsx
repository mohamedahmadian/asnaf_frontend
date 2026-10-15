import { CalendarDays, Hash, RectangleVertical } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FormField, fieldClassName } from '../../components/ui/Form'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { inquiryLetterFragment, type LetterPaper } from './inquiry-api'
import type { CaseInquiryLetter } from './inquiry-types'

export function useEditableLetter(
  letter: CaseInquiryLetter | undefined,
  saveUrl: string | null,
  queryKey: readonly unknown[],
) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [letterNo, setLetterNo] = useState(letter?.letterNo ?? '')
  const [issuedAt, setIssuedAt] = useState(letter?.issuedAt ?? '')
  const [synced, setSynced] = useState('')
  const stamp = letter ? `${letter.id}|${letter.letterNo}|${letter.issuedAt}` : ''
  if (letter && stamp !== synced) {
    setSynced(stamp)
    setLetterNo(letter.letterNo ?? '')
    setIssuedAt(letter.issuedAt ?? '')
  }

  const view = useMemo(() => {
    if (!letter) return undefined
    const date = issuedAt || letter.issuedAt
    return {
      ...letter,
      letterNo,
      issuedAt: date,
      fields: { ...letter.fields, date, letterNo },
    }
  }, [letter, letterNo, issuedAt])

  async function persist(next?: { letterNo?: string; issuedAt?: string }) {
    if (!letter || !view) return null
    const no = (next?.letterNo ?? letterNo).trim()
    const date = (next?.issuedAt ?? issuedAt).trim()
    const current: CaseInquiryLetter = {
      ...view,
      letterNo: no,
      issuedAt: date,
      fields: { ...view.fields, date, letterNo: no },
    }
    if (!saveUrl) return current
    if (!no || !date) {
      toast.error(t('cases.letterIssueInvalid'))
      return null
    }
    if (no === letter.letterNo && date === letter.issuedAt) return current
    try {
      const { data } = await api.put<CaseInquiryLetter>(saveUrl, { letterNo: no, issuedAt: date })
      queryClient.setQueryData(queryKey, data)
      return data
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
      setLetterNo(letter.letterNo ?? '')
      setIssuedAt(letter.issuedAt ?? '')
      return null
    }
  }

  return { letterNo, setLetterNo, issuedAt, setIssuedAt, view, persist }
}

export function useInquiryLetterMarkup(
  letter: CaseInquiryLetter | undefined,
  locale: string,
  paper: LetterPaper = 'A4',
) {
  const [html, setHtml] = useState('')
  useEffect(() => {
    if (!letter) {
      setHtml('')
      return
    }
    let live = true
    void inquiryLetterFragment(letter, locale, paper).then((markup) => {
      if (live) setHtml(markup)
    })
    return () => {
      live = false
    }
  }, [letter, locale, paper])
  return html
}

export function useLetterPaper(letter: CaseInquiryLetter | undefined) {
  const [paper, setPaper] = useState<LetterPaper>('A4')
  const applied = useRef(false)
  useEffect(() => {
    if (applied.current || !letter) return
    applied.current = true
    const size = letter.letterhead.defaultPaper
    if (size === 'A4' || size === 'A5') setPaper(size)
  }, [letter])
  return [paper, setPaper] as const
}

export function LetterIssueBar({
  letterNo,
  issuedAt,
  paper,
  onLetterNoChange,
  onIssuedAtChange,
  onLetterNoCommit,
  onPaperChange,
}: {
  letterNo: string
  issuedAt: string
  paper: LetterPaper
  onLetterNoChange: (value: string) => void
  onIssuedAtChange: (value: string) => void
  onLetterNoCommit: () => void
  onPaperChange: (paper: LetterPaper) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="print:hidden mx-auto mb-4 grid w-full max-w-[210mm] gap-3 sm:grid-cols-3">
      <FormField icon={Hash} label={t('cases.letterNo')} htmlFor="letter-issue-no">
        <input
          id="letter-issue-no"
          dir="ltr"
          className={`${fieldClassName} digit-field`}
          value={letterNo}
          maxLength={40}
          onChange={(event) => onLetterNoChange(event.target.value)}
          onBlur={onLetterNoCommit}
        />
      </FormField>
      <FormField icon={CalendarDays} label={t('cases.letterIssuedAt')} htmlFor="letter-issue-date">
        <PersianDateField id="letter-issue-date" value={issuedAt || undefined} onChange={(next) => onIssuedAtChange(next ?? '')} />
      </FormField>
      <FormField icon={RectangleVertical} label={t('cases.letterPaperSize')} htmlFor="letter-paper-size">
        <SearchSelect<LetterPaper>
          id="letter-paper-size"
          value={paper}
          onChange={onPaperChange}
          options={[
            { value: 'A4', label: 'A4' },
            { value: 'A5', label: 'A5' },
          ]}
        />
      </FormField>
    </div>
  )
}
