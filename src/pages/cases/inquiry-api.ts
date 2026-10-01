import { api } from '../../lib/api'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { CaseInquiryStatus } from './inquiry-types'

export function fillInquiryLetter(template: string, fields: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => fields[key] ?? '')
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
