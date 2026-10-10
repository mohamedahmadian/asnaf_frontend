import { api } from '../../lib/api'
import type { ViolationAttachment } from '../../types/app'

const AUDIO_NAME = /\.(webm|ogg|mp3|m4a|wav|aac)$/i

export function isAudioAttachment(item: Pick<ViolationAttachment, 'mimeType' | 'originalName'>) {
  if (item.mimeType?.toLowerCase().startsWith('audio/')) return true
  return AUDIO_NAME.test(item.originalName ?? '')
}

export async function openViolationFile(url: string) {
  const { data } = await api.get<Blob>(url, { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(data)
  window.open(objectUrl, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export function appendFiles(body: FormData, files: File[]) {
  for (const file of files) body.append('files', file)
}
