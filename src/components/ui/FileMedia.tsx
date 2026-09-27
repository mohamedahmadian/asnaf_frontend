import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

function useFileObjectUrl(fileId?: string | null) {
  const [src, setSrc] = useState<string>()

  useEffect(() => {
    if (!fileId) {
      setSrc(undefined)
      return
    }
    let objectUrl: string | undefined
    let cancelled = false
    void api
      .get<Blob>(`/files/${fileId}`, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return
        const header = String(response.headers['content-type'] ?? '')
        const mime = header.split(';')[0].trim() || response.data.type || 'application/octet-stream'
        const blob =
          response.data.type && response.data.type.split(';')[0] === mime
            ? response.data
            : new Blob([response.data], { type: mime })
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setSrc(undefined)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  return src
}

export function FileAudio({
  fileId,
  className,
}: {
  fileId: string
  className?: string
}) {
  const src = useFileObjectUrl(fileId)
  if (!src) {
    return <div className={`h-10 w-full animate-pulse rounded-xl bg-teal-50 ${className ?? ''}`} aria-hidden />
  }
  return <audio className={className} controls playsInline preload="metadata" src={src} />
}

export function FileVideo({
  fileId,
  className,
}: {
  fileId: string
  className?: string
}) {
  const src = useFileObjectUrl(fileId)
  if (!src) {
    return <div className={`h-40 w-full animate-pulse rounded-2xl bg-ink-900/10 ${className ?? ''}`} aria-hidden />
  }
  return <video className={className} controls playsInline preload="metadata" src={src} />
}
