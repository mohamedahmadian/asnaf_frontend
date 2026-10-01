import { api } from '../../lib/api'

export async function openViolationFile(url: string) {
  const { data } = await api.get<Blob>(url, { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(data)
  window.open(objectUrl, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export function appendFiles(body: FormData, files: File[]) {
  for (const file of files) body.append('files', file)
}
