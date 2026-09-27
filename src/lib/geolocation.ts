export type GeoErrorKind =
  | 'unsupported'
  | 'insecure'
  | 'denied'
  | 'unavailable'
  | 'timeout'

export type GeoCoords = {
  latitude: number
  longitude: number
  accuracy: number
}

const COARSE_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 120_000,
}

const FINE_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20_000,
  maximumAge: 5_000,
}

const OVERALL_TIMEOUT_MS = 28_000
const REFINE_TIMEOUT_MS = 10_000
const GOOD_ACCURACY_M = 50

export function isSecureGeolocationContext() {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext) return true
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

export async function queryGeolocationPermission() {
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' })
    if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
      return result.state
    }
    return 'unknown' as const
  } catch {
    return 'unknown' as const
  }
}

export function geoErrorI18nKey(kind: GeoErrorKind) {
  switch (kind) {
    case 'denied':
      return 'location.geoDenied'
    case 'insecure':
      return 'location.geoInsecure'
    case 'timeout':
      return 'location.geoTimeout'
    case 'unsupported':
      return 'location.geoUnsupported'
    default:
      return 'location.geoUnavailable'
  }
}

function toCoords(position: GeolocationPosition): GeoCoords {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy)
      ? position.coords.accuracy
      : Number.POSITIVE_INFINITY,
  }
}

/**
 * Android Chrome/Samsung often time out on a single high-accuracy
 * getCurrentPosition. Start both a fast network fix and a GPS watch from the
 * same user tap so the permission prompt is not lost after an await.
 */
export function requestBrowserGeolocation(options: {
  onPosition: (coords: GeoCoords) => void
  onError: (kind: GeoErrorKind) => void
  onSettled?: (reason: 'complete' | 'cancel') => void
}) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      options.onError('unsupported')
      options.onSettled?.('complete')
    })
    return () => {
      cancelled = true
    }
  }
  if (!isSecureGeolocationContext()) {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      options.onError('insecure')
      options.onSettled?.('complete')
    })
    return () => {
      cancelled = true
    }
  }

  let settled = false
  let watchId: number | null = null
  let best: GeoCoords | null = null
  let refineTimer = 0
  let overallTimer = 0

  const cleanup = () => {
    window.clearTimeout(refineTimer)
    window.clearTimeout(overallTimer)
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
  }

  const finishOk = () => {
    if (settled) return
    settled = true
    cleanup()
    options.onSettled?.('complete')
  }

  const finishError = (kind: GeoErrorKind) => {
    if (settled) return
    settled = true
    cleanup()
    if (!best) options.onError(kind)
    options.onSettled?.('complete')
  }

  const consider = (position: GeolocationPosition) => {
    if (settled) return
    const coords = toCoords(position)
    if (best && coords.accuracy >= best.accuracy) return
    best = coords
    options.onPosition(coords)
    if (coords.accuracy <= GOOD_ACCURACY_M) {
      finishOk()
      return
    }
    if (!refineTimer) {
      refineTimer = window.setTimeout(finishOk, REFINE_TIMEOUT_MS)
    }
  }

  const onWatchError = (error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED) {
      finishError('denied')
    }
  }

  try {
    watchId = navigator.geolocation.watchPosition(consider, onWatchError, FINE_OPTIONS)
    navigator.geolocation.getCurrentPosition(consider, (error) => {
      if (error.code === error.PERMISSION_DENIED) finishError('denied')
    }, COARSE_OPTIONS)
  } catch {
    finishError('unsupported')
    return () => undefined
  }

  overallTimer = window.setTimeout(() => {
    if (best) finishOk()
    else finishError('timeout')
  }, OVERALL_TIMEOUT_MS)

  return () => {
    if (settled) return
    settled = true
    cleanup()
    options.onSettled?.('cancel')
  }
}
