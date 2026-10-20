import { api } from '../../lib/api'
import i18n from '../../i18n'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { CaseInquiryLetter, CaseInquiryStatus } from './inquiry-types'
import type { LetterPaper, LetterText } from './inquiry-letter-print'
import {
  downloadInquiryLetter as downloadInquiryLetterWithText,
  downloadInquiryLetters as downloadInquiryLettersWithText,
  inquiryLetterFragment as inquiryLetterFragmentWithText,
  inquiryLetterHtml as inquiryLetterHtmlWithText,
  printInquiryLetter as printInquiryLetterWithText,
  printInquiryLetters as printInquiryLettersWithText,
} from './inquiry-letter-print'

export {
  fillInquiryLetter,
  fillInquiryLetterHtml,
  inquiryLetterFilename,
  presentInquiryLetter,
  type LetterPaper,
} from './inquiry-letter-print'

const t: LetterText = (key) => i18n.t(key)

export async function inquiryLetterFragment(
  letter: CaseInquiryLetter,
  locale: string,
  paper: LetterPaper = 'A4',
) {
  return inquiryLetterFragmentWithText(letter, locale, paper, t)
}

export async function inquiryLetterHtml(
  letter: CaseInquiryLetter,
  locale: string,
  paper: LetterPaper = 'A4',
) {
  return inquiryLetterHtmlWithText(letter, locale, paper, t)
}

export async function downloadInquiryLetter(
  filename: string,
  letter: CaseInquiryLetter,
  locale: string,
  paper: LetterPaper = 'A4',
) {
  await downloadInquiryLetterWithText(filename, letter, locale, paper, t)
}

export async function downloadInquiryLetters(
  letters: CaseInquiryLetter[],
  locale: string,
  paper: LetterPaper = 'A4',
) {
  await downloadInquiryLettersWithText(letters, locale, paper, t)
}

export async function printInquiryLetter(
  letter: CaseInquiryLetter,
  locale: string,
  paper: LetterPaper = 'A4',
) {
  await printInquiryLetterWithText(letter, locale, paper, t)
}

export async function printInquiryLetters(
  letters: CaseInquiryLetter[],
  locale: string,
  paper: LetterPaper = 'A4',
) {
  await printInquiryLettersWithText(letters, locale, paper, t)
}

export async function submitInquiryDecision(
  url: string,
  status: CaseInquiryStatus,
  note: string,
  file: File | null,
) {
  const body = new FormData()
  body.append('status', status)
  if (note.trim()) body.append('note', note.trim())
  if (file) {
    const prepared = file.type.startsWith('image/') ? await optimizeImageFile(file) : file
    body.append('file', prepared)
  }
  await api.post(url, body)
}

export async function openInquiryFile(fileId: string, filesPath = '/cases/inquiries/files') {
  const { data } = await api.get<Blob>(`${filesPath}/${fileId}`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
