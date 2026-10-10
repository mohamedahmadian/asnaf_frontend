import { AudioLines, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Form'

type SpeechResultList = ArrayLike<{
  isFinal: boolean
  0?: { transcript: string }
}>

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: SpeechResultList }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function speechRecognitionCtor() {
  const host = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

function speechLang(locale: string) {
  if (locale.startsWith('ar')) return 'ar-SA'
  if (locale.startsWith('ur')) return 'ur-PK'
  if (locale.startsWith('hi')) return 'hi-IN'
  if (locale.startsWith('en')) return 'en-US'
  return 'fa-IR'
}

function joinDictation(base: string, spoken: string, maxLength: number) {
  const extra = spoken.replace(/\s+/g, ' ').trim()
  const head = base.trimEnd()
  const next = extra ? (head ? `${head} ${extra}` : extra) : head
  return next.slice(0, maxLength)
}

export function DescriptionDictation({
  value,
  onChange,
  maxLength,
  blocked,
  onListeningChange,
}: {
  value: string
  onChange: (value: string) => void
  maxLength: number
  blocked?: boolean
  onListeningChange?: (listening: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [listening, setListening] = useState(false)
  const listeningRef = useRef(false)
  const allowRestartRef = useRef(false)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const baseRef = useRef('')
  const latestRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const onListeningChangeRef = useRef(onListeningChange)

  latestRef.current = value
  onChangeRef.current = onChange
  onListeningChangeRef.current = onListeningChange

  useEffect(() => {
    onListeningChangeRef.current?.(listening)
  }, [listening])

  useEffect(() => {
    return () => {
      listeningRef.current = false
      allowRestartRef.current = false
      const recognition = recognitionRef.current
      recognitionRef.current = null
      if (recognition) {
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        try {
          recognition.abort()
        } catch {
          /* already stopped */
        }
      }
    }
  }, [])

  function stop() {
    listeningRef.current = false
    allowRestartRef.current = false
    setListening(false)
    try {
      recognitionRef.current?.stop()
    } catch {
      /* already stopped */
    }
  }

  function start() {
    if (blocked) {
      toast.error(t('violations.voiceStillRecording'))
      return
    }
    if (!window.isSecureContext) {
      toast.error(t('violations.dictationNeedsHttps'))
      return
    }
    const Ctor = speechRecognitionCtor()
    if (!Ctor) {
      toast.error(t('violations.dictationUnsupported'))
      return
    }
    const recognition = new Ctor()
    recognition.lang = speechLang(locale)
    recognition.continuous = true
    recognition.interimResults = true
    baseRef.current = value
    allowRestartRef.current = true
    recognition.onresult = (event) => {
      let spoken = ''
      for (let index = 0; index < event.results.length; index += 1) {
        spoken += event.results[index]?.[0]?.transcript ?? ''
      }
      const next = joinDictation(baseRef.current, spoken, maxLength)
      latestRef.current = next
      onChangeRef.current(next)
    }
    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      allowRestartRef.current = false
      listeningRef.current = false
      setListening(false)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast.error(t('violations.dictationDenied'))
        return
      }
      if (event.error === 'network') {
        toast.error(t('violations.dictationNetwork'))
        return
      }
      toast.error(t('violations.dictationFailed'))
    }
    recognition.onend = () => {
      if (listeningRef.current && allowRestartRef.current) {
        baseRef.current = latestRef.current
        try {
          recognition.start()
          return
        } catch {
          /* start again failed */
        }
      }
      listeningRef.current = false
      setListening(false)
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      listeningRef.current = true
      setListening(true)
    } catch {
      allowRestartRef.current = false
      toast.error(t('violations.dictationFailed'))
    }
  }

  return (
    <div className="flex items-center gap-3">
      {listening ? (
        <p className="text-xs font-medium text-teal-700" aria-live="polite">
          {t('violations.dictationListening')}
        </p>
      ) : null}
      <Button
        type="button"
        variant={listening ? 'danger' : 'soft'}
        className="ms-auto"
        aria-pressed={listening}
        onClick={listening ? stop : start}
      >
        {listening ? <Square className="size-4" aria-hidden /> : <AudioLines className="size-4" aria-hidden />}
        {t(listening ? 'violations.dictationStop' : 'violations.dictationStart')}
      </Button>
    </div>
  )
}
