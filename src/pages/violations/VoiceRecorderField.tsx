import { Mic, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'

export type StoredVoiceClip = {
  id: string
  href: string
  removed?: boolean
}

const MAX_BYTES = 8 * 1024 * 1024

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function baseMime(type: string) {
  const mime = type.split(';')[0]?.trim().toLowerCase()
  return mime && mime.startsWith('audio/') ? mime : 'audio/webm'
}

function extensionFor(mime: string) {
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('aac')) return 'aac'
  return 'webm'
}

function formatElapsed(ms: number, locale: string) {
  const total = Math.floor(ms / 1000)
  const minutes = String(Math.floor(total / 60)).padStart(2, '0')
  const seconds = String(total % 60).padStart(2, '0')
  return localizeDigits(`${minutes}:${seconds}`, locale)
}

function useAudioUrls(files: File[]) {
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file))
    setUrls(next)
    return () => {
      for (const url of next) URL.revokeObjectURL(url)
    }
  }, [files])

  return urls
}

function StoredAudio({ href }: { href: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    setFailed(false)
    setUrl(undefined)
    void api
      .get<Blob>(href, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return
        const headerType = typeof data.type === 'string' && data.type ? data.type : 'audio/webm'
        const blob = data.type ? data : new Blob([data], { type: headerType })
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [href])

  if (failed) return <span className="min-w-0 flex-1 text-xs text-ink-500">{t('violations.voicePlaybackFailed')}</span>
  if (!url) return <span className="min-w-0 flex-1 text-xs text-ink-400">{t('common.loading')}</span>
  return <audio src={url} controls preload="metadata" className="h-10 w-full min-w-0 flex-1" dir="ltr" />
}

export function VoiceRecorderField({
  files,
  onFilesChange,
  onRecordingChange,
  beforeStart,
  existing = [],
  onToggleExisting,
}: {
  files: File[]
  onFilesChange: (files: File[]) => void
  onRecordingChange?: (recording: boolean) => void
  beforeStart?: () => boolean
  existing?: StoredVoiceClip[]
  onToggleExisting?: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const urls = useAudioUrls(files)
  const filesRef = useRef(files)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const onRecordingChangeRef = useRef(onRecordingChange)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  filesRef.current = files
  onRecordingChangeRef.current = onRecordingChange

  useEffect(() => {
    onRecordingChangeRef.current?.(recording)
  }, [recording])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      const recorder = recorderRef.current
      recorderRef.current = null
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function clearTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  async function start() {
    if (beforeStart && !beforeStart()) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error(t('violations.voiceUnsupported'))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onstop = () => {
        clearTimer()
        stopTracks()
        setRecording(false)
        const type = baseMime(recorder.mimeType || mime || 'audio/webm')
        const blob = new Blob(chunks, { type })
        if (blob.size < 200) {
          toast.error(t('violations.voiceEmpty'))
          return
        }
        if (blob.size > MAX_BYTES) {
          toast.error(t('common.fileTooLarge'))
          return
        }
        const current = filesRef.current
        const name = `ضبط-صدا-${current.length + 1}.${extensionFor(type)}`
        onFilesChange([...current, new File([blob], name, { type, lastModified: Date.now() })])
      }
      recorderRef.current = recorder
      recorder.start(250)
      startedAtRef.current = Date.now()
      setElapsed(0)
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current)
      }, 250)
    } catch (error) {
      stopTracks()
      const name = error instanceof DOMException ? error.name : ''
      toast.error(
        name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError'
          ? t('violations.voiceDenied')
          : t('violations.voiceUnsupported'),
      )
    }
  }

  function stop() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    if (recorder.state === 'recording') recorder.requestData()
    recorder.stop()
  }

  return (
    <div className="space-y-3">
      {existing.length ? (
        <ul className="space-y-2">
          {existing.map((item, index) => (
            <li
              key={item.id}
              className={`flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 ${
                item.removed ? 'opacity-40' : ''
              }`}
            >
              <StoredAudio href={item.href} />
              <span
                className={`hidden max-w-28 truncate text-xs sm:inline ${
                  item.removed ? 'text-ink-400 line-through' : 'text-ink-600'
                }`}
              >
                {t('violations.attachmentVoice')} {formatNumber(index + 1, locale)}
              </span>
              {onToggleExisting ? (
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  aria-label={t('violations.removeAttachment')}
                  title={t('violations.removeAttachment')}
                  onClick={() => onToggleExisting(item.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {files.length ? (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2"
            >
              <audio src={urls[index]} controls preload="metadata" className="h-10 w-full min-w-0 flex-1" dir="ltr" />
              <span className="hidden max-w-28 truncate text-xs text-ink-600 sm:inline">
                {t('violations.attachmentVoice')} {formatNumber(existing.length + index + 1, locale)}
              </span>
              <Button
                type="button"
                variant="ghost"
                icon
                aria-label={t('violations.removeAttachment')}
                title={t('violations.removeAttachment')}
                onClick={() => onFilesChange(files.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div
        className={`rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${
          recording ? 'border-teal-500 bg-teal-50' : 'border-line bg-cream-50'
        }`}
      >
        <span
          className={`mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm ${
            recording ? 'animate-pulse' : ''
          }`}
        >
          <Mic className="size-6" aria-hidden />
        </span>
        {recording ? (
          <p className="text-sm font-medium text-teal-800" aria-live="polite">
            {t('violations.voiceRecording')}
            <span className="ms-2 inline-block font-semibold tabular-nums" dir="ltr">
              {formatElapsed(elapsed, locale)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-ink-700">{t('violations.attachmentVoice')}</p>
        )}
        <div className="mt-4 flex justify-center">
          {recording ? (
            <Button type="button" variant="danger" onClick={stop}>
              <Square className="size-4" aria-hidden />
              {t('violations.voiceStop')}
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => void start()}>
              <Mic className="size-4" aria-hidden />
              {t('violations.voiceStart')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
