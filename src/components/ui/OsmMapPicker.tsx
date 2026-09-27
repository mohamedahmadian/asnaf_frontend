import { LocateFixed, MapPinned } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  queryGeolocationPermission,
  requestBrowserGeolocation,
  type GeoErrorKind,
} from '../../lib/geolocation'
import { layoutSpiderfyMarkers } from '../../lib/map-spiderfy'
import { isProjectColor, projectColor, projectColorAlpha } from '../../lib/project-color'
import { Button } from './Form'

const pinIcon = L.divIcon({
  className: 'eskan-map-pin',
  html: '<span class="eskan-map-pin-dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export type MapFocus = {
  lat: number
  lng: number
  zoom?: number
  bounds?: MapBounds
}

export type MapBounds = {
  south: number
  west: number
  north: number
  east: number
}

const IRAN_BOUNDS: MapBounds = {
  south: 25.06,
  west: 44.03,
  north: 39.78,
  east: 63.33,
}

export type MapOverlayMarkerTone =
  | 'not-started'
  | 'in-progress'
  | 'suspended'
  | 'completed'
  | 'unset'

export type MapOverlayMarker = {
  id: string
  lat: number
  lng: number
  kind: 'previous' | 'current' | 'next' | 'history' | 'station' | 'project'
  tone?: MapOverlayMarkerTone
  badge: string
  title: string
  farTitle?: string
  nearTitle?: string
  nearZoom?: number
  selected?: boolean
  color?: string
  popupHtml?: string
  pulse?: boolean
  pulseStrong?: boolean
  hint?: string
  tipFooter?: string
  spidered?: boolean
}

function markerVisibleTitle(marker: MapOverlayMarker, zoom: number) {
  const nearZoom = marker.nearZoom ?? 14
  if (marker.farTitle && zoom < nearZoom) return marker.farTitle
  return marker.nearTitle ?? marker.title
}

const PROJECT_PIN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>'

function projectPinHtml(marker: MapOverlayMarker) {
  const title = marker.nearTitle || marker.title
  const selected = marker.selected ? ' eskan-project-pin-selected' : ''
  const pulse = marker.pulse ? ' eskan-project-pin-pulse' : ''
  const pulseStrong = marker.pulseStrong ? ' eskan-project-pin-pulse-strong' : ''
  const spidered = marker.spidered ? ' eskan-project-pin-spidered' : ''
  const color = isProjectColor(marker.color) ? projectColor(marker.color) : '#2ebdb6'
  const fill = `background:${color};color:${color};box-shadow:0 0 0 3px rgba(255,255,255,0.92),${
    marker.selected
      ? `0 0 0 7px ${projectColorAlpha(color, 0.38)},0 10px 22px ${projectColorAlpha(color, 0.42)}`
      : `0 8px 18px ${projectColorAlpha(color, 0.38)}`
  }`
  const hint = marker.hint
    ? `<span class="eskan-project-pin-tip-meta">${marker.hint}</span>`
    : ''
  const code =
    !marker.spidered && marker.badge
      ? `<span class="eskan-project-pin-code">${marker.badge}</span>`
      : ''
  const label = marker.spidered
    ? `<span class="eskan-project-pin-label">${title}</span>`
    : ''
  return `<span class="eskan-project-pin${selected}${pulse}${pulseStrong}${spidered}" style="color:${color}"><span class="eskan-project-pin-pulse-ring" aria-hidden="true"></span><span class="eskan-project-pin-glyph" style="${fill}">${PROJECT_PIN_ICON}</span>${code}${label}<span class="eskan-project-pin-tip" dir="rtl"><span class="eskan-project-pin-tip-title">${title}</span>${hint}</span></span>`
}

function overlayMarkerHtml(marker: MapOverlayMarker, zoom = 12) {
  if (marker.kind === 'history') {
    return `<span class="eskan-history-pin">${marker.badge}</span>`
  }
  if (marker.kind === 'project') {
    return projectPinHtml(marker)
  }
  return `<span class="eskan-route-pin"><span class="eskan-route-pin-badge">${marker.badge}</span><span class="eskan-route-pin-title">${markerVisibleTitle(marker, zoom)}</span></span>`
}

function overlayMarkerIcon(marker: MapOverlayMarker, zoom: number) {
  const isHistory = marker.kind === 'history'
  const isProject = marker.kind === 'project'
  const spidered = Boolean(marker.spidered)
  return L.divIcon({
    className: `eskan-route-pin-wrap eskan-route-pin-${marker.kind}${
      marker.tone ? ` eskan-route-pin-tone-${marker.tone}` : ''
    }${marker.pulse ? ' eskan-route-pin-pulse' : ''}${
      spidered ? ' eskan-route-pin-spidered' : ''
    }`,
    html: overlayMarkerHtml(marker, zoom),
    iconSize: isHistory ? [28, 28] : spidered ? [112, 86] : isProject ? [80, 54] : [132, 52],
    iconAnchor: isHistory ? [14, 14] : isProject ? [spidered ? 56 : 40, 16] : [66, 50],
  })
}

export type MapOverlayClickPoint = {
  x: number
  y: number
}

export type MapSelectedContainerPoint = {
  x: number
  y: number
  width: number
  height: number
}

export type MapOverlayPolygon = {
  id: string
  latlngs: { lat: number; lng: number }[]
  color?: string
  selected?: boolean
  title?: string
}

export type MapOverlays = {
  markers: MapOverlayMarker[]
  polygons?: MapOverlayPolygon[]
  path?: { lat: number; lng: number }[]
  /** If set, `fit` zooms to these points instead of every marker and path vertex. */
  fitPoints?: { lat: number; lng: number }[]
  fit?: boolean
  fitMaxZoom?: number
}

function overlayLatLngs(overlays: MapOverlays | null, extra?: L.LatLng | null) {
  if (!overlays) return []
  const points = [
    ...overlays.markers.map((marker) => L.latLng(marker.lat, marker.lng)),
    ...(overlays.path ?? []).map((point) => L.latLng(point.lat, point.lng)),
    ...(overlays.polygons ?? []).flatMap((polygon) =>
      polygon.latlngs.map((point) => L.latLng(point.lat, point.lng)),
    ),
  ]
  if (extra) points.push(extra)
  return points
}

function overlayFitLatLngs(overlays: MapOverlays | null, extra?: L.LatLng | null) {
  if (!overlays) return []
  if (overlays.fitPoints?.length) {
    const points = overlays.fitPoints.map((point) => L.latLng(point.lat, point.lng))
    if (extra) points.push(extra)
    return points
  }
  return overlayLatLngs(overlays, extra)
}

function overlayFitKey(points: L.LatLng[]) {
  return points.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join('|')
}

function fitOverlayBounds(map: L.Map, overlays: MapOverlays | null, extra?: L.LatLng | null) {
  const points = overlayFitLatLngs(overlays, extra)
  if (!points.length) return
  const bounds = L.latLngBounds(points)
  if (!bounds.isValid()) return
  const maxZoom = overlays?.fitMaxZoom ?? 16
  if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
    map.setView(bounds.getCenter(), Math.min(maxZoom, 14))
    return
  }
  map.fitBounds(bounds, { padding: [56, 56], maxZoom })
}

function parseLatLng(latitude: string, longitude: string) {
  const latText = latitude.trim()
  const lngText = longitude.trim()
  if (!latText || !lngText) return null
  const lat = Number(latText)
  const lng = Number(lngText)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return L.latLng(lat, lng)
}

function formatCoord(value: number) {
  return String(Number(value.toFixed(6)))
}

function toLeafletBounds(bounds: MapBounds) {
  return L.latLngBounds(
    [bounds.south, bounds.west],
    [bounds.north, bounds.east],
  )
}

function applyBoundsView(map: L.Map, bounds: L.LatLngBounds) {
  map.fitBounds(bounds, { padding: [20, 20], animate: false })
}

const SELECT_ZOOM_LEVELS = 3
const SELECT_MAX_ZOOM = 16

function polygonLatLngBounds(latlngs: { lat: number; lng: number }[]) {
  return L.latLngBounds(latlngs.map((point) => L.latLng(point.lat, point.lng)))
}

function stageMapView(map: L.Map, target: L.LatLng, targetZoom: number) {
  map.stop()
  const start = map.getCenter()
  const startZoom = map.getZoom()
  const endZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), targetZoom))
  if (start.distanceTo(target) < 4 && Math.abs(startZoom - endZoom) < 0.15) return
  map.setView(target, endZoom, { animate: true, duration: 0.55 })
}

function paintOverlayContents(
  map: L.Map,
  layer: L.LayerGroup,
  overlays: MapOverlays,
  spiderfyOverlaps: boolean,
  onMarkerClick: (id: string, point: MapOverlayClickPoint) => void,
) {
  if (overlays.path && overlays.path.length >= 2) {
    L.polyline(
      overlays.path.map((point) => [point.lat, point.lng] as L.LatLngTuple),
      {
        color: '#2EBDB6',
        weight: 4,
        opacity: 0.88,
        dashArray: '10 8',
        lineCap: 'round',
      },
    ).addTo(layer)
  }
  for (const polygon of overlays.polygons ?? []) {
    if (polygon.latlngs.length < 3) continue
    const color = isProjectColor(polygon.color) ? projectColor(polygon.color) : '#2ebdb6'
    const shape = L.polygon(
      polygon.latlngs.map((point) => [point.lat, point.lng] as L.LatLngTuple),
      {
        color,
        weight: polygon.selected ? 4 : 3,
        opacity: 0.95,
        fillColor: color,
        fillOpacity: polygon.selected ? 0.34 : 0.18,
        bubblingMouseEvents: false,
        interactive: true,
      },
    ).addTo(layer)
    if (polygon.selected) shape.bringToFront()
    const emitPolygonClick = (latlng: L.LatLng) => {
      const point = map.latLngToContainerPoint(latlng)
      onMarkerClick(polygon.id, { x: point.x, y: point.y })
    }
    if (polygon.title) {
      shape.bindTooltip(polygon.title, {
        permanent: true,
        direction: 'center',
        interactive: true,
        className: `eskan-project-polygon-label${polygon.selected ? ' is-selected' : ''}`,
        opacity: 1,
      })
      const tooltip = shape.getTooltip()
      tooltip?.on('click', (event: L.LeafletMouseEvent) => {
        L.DomEvent.stop(event)
        emitPolygonClick(event.latlng ?? shape.getBounds().getCenter())
      })
    }
    shape.on('click', (event: L.LeafletMouseEvent) => {
      L.DomEvent.stop(event)
      emitPolygonClick(event.latlng)
    })
  }

  const layout = spiderfyOverlaps
    ? layoutSpiderfyMarkers(map, overlays.markers)
    : { markers: overlays.markers, legs: [], hubs: [] }

  for (const hub of layout.hubs) {
    L.circleMarker([hub.lat, hub.lng], {
      radius: hub.selected ? 6 : 5,
      color: hub.color,
      weight: 2.2,
      opacity: 0.95,
      fillColor: '#fff',
      fillOpacity: 1,
      interactive: false,
    }).addTo(layer)
  }
  for (const leg of layout.legs) {
    const line = L.polyline(
      [
        [leg.from.lat, leg.from.lng],
        [leg.to.lat, leg.to.lng],
      ],
      {
        color: leg.color,
        weight: leg.selected ? 2.4 : 1.7,
        opacity: leg.selected ? 0.95 : 0.72,
        dashArray: '5 7',
        lineCap: 'round',
        interactive: false,
      },
    ).addTo(layer)
    if (leg.selected) line.bringToFront()
  }

  for (const marker of layout.markers) {
    const isHistory = marker.kind === 'history'
    const pin = L.marker([marker.lat, marker.lng], {
      icon: overlayMarkerIcon(marker, map.getZoom()),
      zIndexOffset:
        marker.selected || marker.kind === 'current'
          ? 500
          : marker.spidered
            ? 440
            : marker.pulse
              ? 430
              : isHistory
                ? 420
                : 400,
      keyboard: false,
    }).addTo(layer)
    pin.on('click', (event: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(event)
      const point = map.latLngToContainerPoint(event.latlng)
      onMarkerClick(marker.id, { x: point.x, y: point.y })
    })
    if (marker.popupHtml) {
      pin.bindPopup(marker.popupHtml, {
        className: 'eskan-route-popup',
        maxWidth: 280,
        autoClose: false,
      })
    }
  }
}

const DEFAULT_PIN_ZOOM = 16

function addMapTiles(map: L.Map) {
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)
}

export function OsmMapPicker({
  latitude,
  longitude,
  onChange,
  active = true,
  variant = 'collapsible',
  readOnly = false,
  autoGeolocate = false,
  showGeolocate = false,
  focus = null,
  maxBounds = null,
  heightClass = 'h-72',
  overlays = null,
  fill = false,
  plainChrome = false,
  look = 'default',
  pinZoom = DEFAULT_PIN_ZOOM,
  keepInView = null,
  onMarkerClick,
  onSelectedContainerPoint,
  onMapClick,
  zoomOnSelected = false,
  spiderfyOverlaps = false,
  onGeolocate,
  onGeoError,
  onGeoOutside,
}: {
  latitude: string
  longitude: string
  onChange: (latitude: string, longitude: string) => void
  active?: boolean
  variant?: 'collapsible' | 'always'
  readOnly?: boolean
  autoGeolocate?: boolean
  showGeolocate?: boolean
  focus?: MapFocus | null
  maxBounds?: MapBounds | null
  heightClass?: string
  overlays?: MapOverlays | null
  fill?: boolean
  plainChrome?: boolean
  look?: 'default' | 'tablet'
  pinZoom?: number
  keepInView?: {
    id: string
    padding: { top: number; right: number; bottom: number; left: number }
  } | null
  onMarkerClick?: (id: string, point: MapOverlayClickPoint) => void
  onSelectedContainerPoint?: (point: MapSelectedContainerPoint | null) => void
  onMapClick?: () => void
  zoomOnSelected?: boolean
  spiderfyOverlaps?: boolean
  onGeolocate?: (latitude: string, longitude: string) => void
  onGeoError?: (kind: GeoErrorKind) => void
  onGeoOutside?: () => void
}) {
  const { t } = useTranslation()
  const alwaysOpen = variant === 'always'
  const [open, setOpen] = useState(alwaysOpen)
  const [locating, setLocating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const overlayLayerRef = useRef<L.LayerGroup | null>(null)
  const overlayFitKeyRef = useRef<string>('')
  const overlaysRef = useRef(overlays)
  const pinZoomRef = useRef(pinZoom)
  const lookRef = useRef(look)
  const onChangeRef = useRef(onChange)
  const onGeolocateRef = useRef(onGeolocate)
  const onGeoErrorRef = useRef(onGeoError)
  const onGeoOutsideRef = useRef(onGeoOutside)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onSelectedContainerPointRef = useRef(onSelectedContainerPoint)
  const onMapClickRef = useRef(onMapClick)
  const maxBoundsRef = useRef(maxBounds)
  const viewFittedRef = useRef(false)
  const overviewViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null)
  const selectedZoomIdRef = useRef<string | null>(null)
  const autoGeoDoneRef = useRef(false)
  const stopGeoRef = useRef<(() => void) | null>(null)
  onChangeRef.current = onChange
  onGeolocateRef.current = onGeolocate
  onGeoErrorRef.current = onGeoError
  onGeoOutsideRef.current = onGeoOutside
  onMarkerClickRef.current = onMarkerClick
  onSelectedContainerPointRef.current = onSelectedContainerPoint
  onMapClickRef.current = onMapClick
  overlaysRef.current = overlays
  maxBoundsRef.current = maxBounds
  pinZoomRef.current = pinZoom
  lookRef.current = look

  const canEdit = !readOnly
  const geolocateEnabled = showGeolocate || (alwaysOpen && !readOnly)

  function placeMarker(map: L.Map, latlng: L.LatLng, draggable: boolean) {
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng)
      if (markerRef.current.dragging) {
        if (draggable) markerRef.current.dragging.enable()
        else markerRef.current.dragging.disable()
      }
      return
    }
    markerRef.current = L.marker(latlng, { icon: pinIcon, draggable }).addTo(map)
    if (draggable) {
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current?.getLatLng()
        if (!pos) return
        onChangeRef.current(formatCoord(pos.lat), formatCoord(pos.lng))
      })
    }
  }

  useEffect(() => {
    if (!open || !containerRef.current || mapRef.current) return

    const container = containerRef.current
    const start = parseLatLng(latitude, longitude)
    const map = L.map(container, {
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: !readOnly,
    })
    const currentOverlays = overlaysRef.current
    if (start) {
      map.setView(start, pinZoomRef.current)
    } else if (currentOverlays?.fit && overlayFitLatLngs(currentOverlays).length) {
      fitOverlayBounds(map, currentOverlays)
    } else if (maxBounds) {
      applyBoundsView(map, toLeafletBounds(maxBounds))
      overviewViewRef.current = { center: map.getCenter(), zoom: map.getZoom() }
    } else if (focus?.bounds) {
      map.fitBounds(toLeafletBounds(focus.bounds), { padding: [56, 56], maxZoom: focus.zoom ?? 16 })
    } else if (focus) {
      map.setView([focus.lat, focus.lng], focus.zoom ?? 9)
    } else {
      map.fitBounds(toLeafletBounds(IRAN_BOUNDS), { padding: [28, 28], maxZoom: 6 })
    }
    addMapTiles(map)

    if (start) placeMarker(map, start, canEdit)

    if (canEdit) {
      map.on('click', (event: L.LeafletMouseEvent) => {
        placeMarker(map, event.latlng, true)
        onChangeRef.current(formatCoord(event.latlng.lat), formatCoord(event.latlng.lng))
      })
    } else {
      map.on('click', (event: L.LeafletMouseEvent) => {
        const origin = event.originalEvent?.target
        if (
          origin instanceof Element &&
          origin.closest('.leaflet-marker-icon, .leaflet-interactive, .leaflet-tooltip')
        ) {
          return
        }
        onMapClickRef.current?.()
      })
    }

    mapRef.current = map
    const frame = window.requestAnimationFrame(() => map.invalidateSize())
    let sized = false
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false })
      const size = map.getSize()
      if (sized || size.x < 80 || size.y < 80) return
      sized = true
      if (selectedZoomIdRef.current) return
      const currentBounds = maxBoundsRef.current
      if (currentBounds) {
        applyBoundsView(map, toLeafletBounds(currentBounds))
        overviewViewRef.current = { center: map.getCenter(), zoom: map.getZoom() }
      }
    })
    observer.observe(container)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
      viewFittedRef.current = false
      overviewViewRef.current = null
      selectedZoomIdRef.current = null
    }
    // Map is created once per open session; lat/lng sync is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map) return
    const next = parseLatLng(latitude, longitude)
    if (!next) return
    const previous = markerRef.current?.getLatLng()
    placeMarker(map, next, canEdit)
    if ((!previous || previous.distanceTo(next) > 1) && !overlays?.fit) {
      const currentZoom = map.getZoom()
      const nextZoom = previous
        ? Math.min(currentZoom, pinZoomRef.current)
        : pinZoomRef.current
      map.setView(next, nextZoom)
    }
  }, [canEdit, latitude, longitude, open, overlays?.fit])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map) return
    if (overlays?.fit) {
      map.setMaxBounds(undefined as unknown as L.LatLngBounds)
      return
    }
    if (maxBounds) {
      const bounds = toLeafletBounds(maxBounds)
      map.setMaxBounds(bounds.pad(0.08))
      map.options.maxBoundsViscosity = 1
      if (!viewFittedRef.current) {
        applyBoundsView(map, bounds)
        viewFittedRef.current = true
      }
      return
    }
    map.setMaxBounds(undefined as unknown as L.LatLngBounds)
    if (focus?.bounds) {
      map.fitBounds(toLeafletBounds(focus.bounds), { padding: [16, 16] })
    } else if (focus) {
      map.setView([focus.lat, focus.lng], focus.zoom ?? 9)
    }
  }, [focus, maxBounds, open, overlays?.fit])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map) return
    overlayLayerRef.current?.remove()
    overlayLayerRef.current = null
    if (
      !overlays ||
      (!overlays.markers.length && !overlays.path?.length && !overlays.polygons?.length)
    ) {
      overlayFitKeyRef.current = ''
      return
    }
    const current: MapOverlays = overlays

    function paint() {
      const leafletMap = mapRef.current
      if (!leafletMap) return
      overlayLayerRef.current?.remove()
      const next = L.layerGroup().addTo(leafletMap)
      overlayLayerRef.current = next
      paintOverlayContents(leafletMap, next, current, spiderfyOverlaps, (id, point) => {
        onMarkerClickRef.current?.(id, point)
      })
    }

    paint()
    if (current.fit) {
      const here = parseLatLng(latitude, longitude)
      const points = overlayFitLatLngs(current, here)
      const fitKey = overlayFitKey(points)
      if (points.length && overlayFitKeyRef.current !== fitKey) {
        overlayFitKeyRef.current = fitKey
        fitOverlayBounds(map, current, here)
        if (spiderfyOverlaps) paint()
      }
    } else {
      overlayFitKeyRef.current = ''
    }
    if (spiderfyOverlaps) map.on('zoomend', paint)
    return () => {
      if (spiderfyOverlaps) map.off('zoomend', paint)
      overlayLayerRef.current?.remove()
      if (overlayLayerRef.current) overlayLayerRef.current = null
    }
  }, [latitude, longitude, open, overlays, spiderfyOverlaps])

  useEffect(() => {
    if (!zoomOnSelected || !open) return
    const map = mapRef.current
    if (!map) return
    const selectedMarker = overlays?.markers.find((item) => item.selected)
    const selectedPolygon = overlays?.polygons?.find((item) => item.selected)
    const selectedId = selectedMarker?.id ?? selectedPolygon?.id ?? null
    if (selectedZoomIdRef.current === selectedId) return
    selectedZoomIdRef.current = selectedId

    if (!selectedId) {
      const overview = overviewViewRef.current
      if (overview) {
        stageMapView(map, overview.center, overview.zoom)
      } else if (maxBoundsRef.current) {
        const bounds = toLeafletBounds(maxBoundsRef.current)
        stageMapView(map, bounds.getCenter(), map.getBoundsZoom(bounds, false, L.point(20, 20)))
      }
      return
    }

    const polyBounds =
      selectedPolygon && selectedPolygon.latlngs.length >= 3
        ? polygonLatLngBounds(selectedPolygon.latlngs)
        : null
    const target = selectedMarker
      ? L.latLng(selectedMarker.lat, selectedMarker.lng)
      : polyBounds?.getCenter()
    if (!target) return

    const overviewZoom = overviewViewRef.current?.zoom ?? map.getZoom()
    const targetZoom = Math.min(overviewZoom + SELECT_ZOOM_LEVELS, SELECT_MAX_ZOOM)
    stageMapView(map, target, targetZoom)
  }, [open, overlays, zoomOnSelected])

  useEffect(() => {
    if (!open || !active || !mapRef.current) return
    const map = mapRef.current
    function resizeAndFit() {
      map.invalidateSize()
      const current = overlaysRef.current
      if (!current?.fit) return
      const here = parseLatLng(latitude, longitude)
      overlayFitKeyRef.current = overlayFitKey(overlayFitLatLngs(current, here))
      fitOverlayBounds(map, current, here)
    }
    const first = window.setTimeout(resizeAndFit, 50)
    const second = window.setTimeout(resizeAndFit, 220)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
    }
  }, [active, latitude, longitude, open])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map || !keepInView) return
    const marker = overlaysRef.current?.markers.find((item) => item.id === keepInView.id)
    const polygon = overlaysRef.current?.polygons?.find((item) => item.id === keepInView.id)
    if (!marker && !polygon?.latlngs.length) return
    const timer = window.setTimeout(() => {
      if (marker) {
        map.panInside(L.latLng(marker.lat, marker.lng), {
          paddingTopLeft: [keepInView.padding.left, keepInView.padding.top],
          paddingBottomRight: [keepInView.padding.right, keepInView.padding.bottom],
          animate: true,
        })
        return
      }
      const bounds = L.latLngBounds(
        (polygon?.latlngs ?? []).map((point) => L.latLng(point.lat, point.lng)),
      )
      if (bounds.isValid()) map.panInside(bounds.getCenter(), {
        paddingTopLeft: [keepInView.padding.left, keepInView.padding.top],
        paddingBottomRight: [keepInView.padding.right, keepInView.padding.bottom],
        animate: true,
      })
    }, 40)
    return () => window.clearTimeout(timer)
  }, [keepInView, open])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map || !onSelectedContainerPoint) return
    let frame = 0
    function report() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const leafletMap = mapRef.current
        if (!leafletMap) return
        const selected =
          overlaysRef.current?.markers.find((item) => item.selected) ??
          overlaysRef.current?.polygons?.find((item) => item.selected)
        const size = leafletMap.getSize()
        if (!selected) {
          onSelectedContainerPointRef.current?.(null)
          return
        }
        const latlng =
          'lat' in selected && 'lng' in selected
            ? L.latLng(selected.lat, selected.lng)
            : L.latLngBounds(selected.latlngs.map((point) => L.latLng(point.lat, point.lng))).getCenter()
        const point = leafletMap.latLngToContainerPoint(latlng)
        onSelectedContainerPointRef.current?.({
          x: point.x,
          y: point.y,
          width: size.x,
          height: size.y,
        })
      })
    }
    report()
    map.on('move', report)
    map.on('zoom', report)
    map.on('resize', report)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      map.off('move', report)
      map.off('zoom', report)
      map.off('resize', report)
    }
  }, [onSelectedContainerPoint, open, overlays])

  function applyPosition(lat: number, lng: number, fromGeo: boolean) {
    const map = mapRef.current
    const latlng = L.latLng(lat, lng)
    const bounds = maxBoundsRef.current
    if (bounds && !toLeafletBounds(bounds).contains(latlng)) {
      return 'outside' as const
    }
    onChangeRef.current(formatCoord(lat), formatCoord(lng))
    if (fromGeo) onGeolocateRef.current?.(formatCoord(lat), formatCoord(lng))
    if (map) {
      placeMarker(map, latlng, canEdit)
      map.setView(latlng, Math.min(map.getZoom() || pinZoomRef.current, pinZoomRef.current))
    }
    return 'ok' as const
  }

  function requestGeolocation(fromAuto: boolean) {
    if (!canEdit) return
    stopGeoRef.current?.()
    setLocating(true)
    let applied = false
    let lastOutside = false

    stopGeoRef.current = requestBrowserGeolocation({
      onPosition(coords) {
        const result = applyPosition(coords.latitude, coords.longitude, !applied)
        if (result === 'ok') {
          applied = true
          lastOutside = false
          setLocating(false)
          return
        }
        lastOutside = true
      },
      onError(kind) {
        if (fromAuto) return
        onGeoErrorRef.current?.(kind)
      },
      onSettled(reason) {
        stopGeoRef.current = null
        setLocating(false)
        if (reason === 'cancel' || fromAuto || applied) return
        if (lastOutside) onGeoOutsideRef.current?.()
      },
    })
  }

  useEffect(() => {
    return () => {
      stopGeoRef.current?.()
      stopGeoRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open || !autoGeolocate || !canEdit || autoGeoDoneRef.current) return
    if (parseLatLng(latitude, longitude)) {
      autoGeoDoneRef.current = true
      return
    }
    autoGeoDoneRef.current = true
    let cancelled = false
    void queryGeolocationPermission().then((state) => {
      if (cancelled || state !== 'granted') return
      requestGeolocation(true)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGeolocate, canEdit, open])

  const showMapToggle = variant === 'collapsible'
  const showGeoButton = geolocateEnabled && open
  const fillBleed = fill && !showMapToggle && !showGeoButton

  return (
    <div
      className={
        showMapToggle || showGeoButton
          ? 'space-y-3'
          : fillBleed
            ? 'absolute inset-0 min-h-0'
            : fill
              ? 'h-full min-h-0'
              : undefined
      }
    >
      {showMapToggle || showGeoButton ? (
        <div className="flex flex-wrap gap-2">
          {showMapToggle ? (
            <Button
              type="button"
              variant="soft"
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
            >
              <MapPinned className="size-4" aria-hidden />
              {open ? t('accommodations.hideMap') : t('accommodations.pickFromMap')}
            </Button>
          ) : null}
          {showGeoButton ? (
            <Button
              type="button"
              variant="soft"
              disabled={locating}
              onClick={() => requestGeolocation(false)}
            >
              <LocateFixed className="size-4" aria-hidden />
              {locating ? t('location.locating') : t('location.useMyLocation')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {open ? (
        look === 'tablet' ? (
          <div dir="ltr" className="map-tablet">
            <div className="map-tablet-bezel">
              <span className="map-tablet-camera" aria-hidden />
              <div className="map-tablet-screen">
                <div
                  ref={containerRef}
                  className={`eskan-osm-map w-full ${fill ? 'h-full' : heightClass}`}
                />
              </div>
              <span className="map-tablet-home" aria-hidden />
            </div>
          </div>
        ) : (
          <div
            dir="ltr"
            className={`overflow-hidden ${
              plainChrome
                ? 'h-full rounded-none border-0 shadow-none'
                : `rounded-2xl border border-line shadow-[0_8px_24px_rgba(20,40,40,0.06)] ${
                    fill ? 'h-full' : ''
                  }`
            }`}
          >
            <div
              ref={containerRef}
              className={`eskan-osm-map w-full ${fill ? 'h-full' : heightClass}`}
            />
          </div>
        )
      ) : null}
    </div>
  )
}
