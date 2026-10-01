import { api } from '../../lib/api'
import { formatDate, localizeDigits } from '../../lib/datetime'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { CaseInquiryLetter, CaseInquiryStatus } from './inquiry-types'

export function fillInquiryLetter(template: string, fields: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => fields[key] ?? '')
}

export function presentInquiryLetter(letter: CaseInquiryLetter, locale: string) {
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
}

export function inquiryLetterFilename(centerName: string) {
  const safe = centerName.replace(/[\\/:*?"<>|]/g, ' ').trim() || 'letter'
  return `${safe}.html`
}

export function inquiryLetterHtml(title: string, body: string) {
  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Vazirmatn,Tahoma,sans-serif;margin:2rem;color:#1c2b2b;line-height:2}h1{font-size:1.125rem;text-align:center;margin:0 0 1.5rem}.letter{white-space:pre-wrap;font-size:0.95rem}</style></head><body><h1>${escapeHtml(title)}</h1><div class="letter">${escapeHtml(body)}</div></body></html>`
}

export function downloadInquiryLetter(filename: string, title: string, body: string) {
  const blob = new Blob([inquiryLetterHtml(title, body)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function printInquiryLetter(title: string, body: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const win = frame.contentWindow
  const doc = frame.contentDocument
  if (!win || !doc) {
    frame.remove()
    return
  }
  let started = false
  const run = () => {
    if (started) return
    started = true
    win.focus()
    win.print()
  }
  win.addEventListener('afterprint', () => frame.remove(), { once: true })
  doc.open()
  doc.write(inquiryLetterHtml(title, body))
  doc.close()
  if (doc.readyState === 'complete') run()
  else win.addEventListener('load', run, { once: true })
  window.setTimeout(run, 300)
  window.setTimeout(() => {
    if (frame.isConnected) frame.remove()
  }, 60_000)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

export async function openInquiryFile(fileId: string) {
  const { data } = await api.get<Blob>(`/cases/inquiries/files/${fileId}`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
