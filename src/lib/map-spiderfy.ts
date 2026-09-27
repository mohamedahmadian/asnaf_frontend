import L from 'leaflet'
import { isProjectColor, projectColor } from './project-color'

export type SpiderfyPoint = { lat: number; lng: number }

export type SpiderfyMarker = {
  id: string
  lat: number
  lng: number
  kind: string
  selected?: boolean
  color?: string
}

export type SpiderfyLeg = {
  from: SpiderfyPoint
  to: SpiderfyPoint
  color: string
  selected?: boolean
}

export type SpiderfyHub = {
  lat: number
  lng: number
  color: string
  selected?: boolean
}

export type SpiderfyLaidMarker<T extends SpiderfyMarker> = T & {
  spidered?: boolean
}

export type SpiderfyLayout<T extends SpiderfyMarker> = {
  markers: SpiderfyLaidMarker<T>[]
  legs: SpiderfyLeg[]
  hubs: SpiderfyHub[]
}

const CLUSTER_PX = 70
const RING_MAX = 8
const LEAF_GAP = 82
const SPIRAL_START = 56
const SPIRAL_STEP = 20
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

type ClusterItem<T extends SpiderfyMarker> = {
  marker: T
  point: L.Point
}

function find(parent: number[], index: number) {
  while (parent[index] !== index) {
    parent[index] = parent[parent[index]]
    index = parent[index]
  }
  return index
}

function clusterByPixel<T extends SpiderfyMarker>(items: ClusterItem<T>[], threshold: number) {
  const parent = items.map((_, index) => index)
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (items[i].point.distanceTo(items[j].point) < threshold) {
        parent[find(parent, j)] = find(parent, i)
      }
    }
  }
  const groups = new Map<number, ClusterItem<T>[]>()
  items.forEach((item, index) => {
    const root = find(parent, index)
    const group = groups.get(root)
    if (group) group.push(item)
    else groups.set(root, [item])
  })
  return [...groups.values()]
}

function averagePoint<T extends SpiderfyMarker>(group: ClusterItem<T>[]) {
  const sum = group.reduce(
    (acc, item) => ({ x: acc.x + item.point.x, y: acc.y + item.point.y }),
    { x: 0, y: 0 },
  )
  return L.point(sum.x / group.length, sum.y / group.length)
}

function sameOrigin<T extends SpiderfyMarker>(group: ClusterItem<T>[]) {
  const first = group[0]?.marker
  if (!first) return false
  return group.every(
    (item) => item.marker.lat === first.lat && item.marker.lng === first.lng,
  )
}

function spiderOffsets(count: number) {
  if (count <= RING_MAX) {
    const radius = count === 2 ? LEAF_GAP / 2 : LEAF_GAP / (2 * Math.sin(Math.PI / count))
    return Array.from({ length: count }, (_, index) => {
      const angle = (2 * Math.PI * index) / count - Math.PI / 2
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
    })
  }
  return Array.from({ length: count }, (_, index) => {
    const radius = SPIRAL_START + index * SPIRAL_STEP
    const angle = index * GOLDEN_ANGLE - Math.PI / 2
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
}

function branchColor(value: string | undefined) {
  return isProjectColor(value) ? projectColor(value) : '#2ebdb6'
}

export function layoutSpiderfyMarkers<T extends SpiderfyMarker>(
  map: L.Map,
  markers: T[],
): SpiderfyLayout<T> {
  const projects = markers.filter((marker) => marker.kind === 'project')
  const others = markers.filter((marker) => marker.kind !== 'project')
  if (projects.length < 2) {
    return { markers, legs: [], hubs: [] }
  }

  const items = projects.map((marker) => ({
    marker,
    point: map.latLngToLayerPoint(L.latLng(marker.lat, marker.lng)),
  }))
  const laid: SpiderfyLaidMarker<T>[] = []
  const legs: SpiderfyLeg[] = []
  const hubs: SpiderfyHub[] = []

  for (const group of clusterByPixel(items, CLUSTER_PX)) {
    if (group.length === 1) {
      laid.push(group[0].marker)
      continue
    }

    const sorted = [...group].sort((a, b) => a.marker.id.localeCompare(b.marker.id))
    const originLatLng = sameOrigin(sorted)
      ? { lat: sorted[0].marker.lat, lng: sorted[0].marker.lng }
      : (() => {
          const mid = map.layerPointToLatLng(averagePoint(sorted))
          return { lat: mid.lat, lng: mid.lng }
        })()
    const originPoint = map.latLngToLayerPoint(L.latLng(originLatLng.lat, originLatLng.lng))
    const selected = sorted.some((item) => item.marker.selected)
    const color = branchColor(
      sorted.find((item) => item.marker.selected)?.marker.color ?? sorted[0].marker.color,
    )
    hubs.push({ ...originLatLng, color, selected })

    spiderOffsets(sorted.length).forEach((offset, index) => {
      const leaf = map.layerPointToLatLng(
        L.point(originPoint.x + offset.x, originPoint.y + offset.y),
      )
      const marker = sorted[index].marker
      laid.push({
        ...marker,
        lat: leaf.lat,
        lng: leaf.lng,
        spidered: true,
      })
      legs.push({
        from: originLatLng,
        to: { lat: leaf.lat, lng: leaf.lng },
        color: branchColor(marker.color),
        selected: marker.selected,
      })
    })
  }

  return { markers: [...laid, ...others], legs, hubs }
}
