import { useEffect, useMemo, useRef, useState } from 'react'
import { AttributionControl, Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import * as L from 'leaflet'
import { APP } from '../config'
import { markerHtml } from './icons'
import type { FlyTo, NearbyPlace, UserPosition } from '../types'

interface Props {
  places: NearbyPlace[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClearSelect: () => void
  user: UserPosition | null
  flyTo: FlyTo | null
}

/** Panel che 64% màn hình, khớp h-[64dvh] của panel. */
const PANEL_RATIO = 0.64

export function MapView({ places, selectedId, onSelect, onClearSelect, user, flyTo }: Props) {
  const { center, zoom } = APP.map
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      zoomControl={false}
      attributionControl={false}
      className="hds-main-map relative z-0 h-full w-full"
    >
      <Tiles />
      <AttributionControl position="bottomright" prefix={false} />
      <Controller flyTo={flyTo} onBackgroundTap={onClearSelect} />
      {user && <UserMarker user={user} />}
      {places.map(p => (
        <PlaceMarker key={p.id} place={p} selected={p.id === selectedId} onSelect={onSelect} />
      ))}
    </MapContainer>
  )
}

function PlaceMarker({
  place,
  selected,
  onSelect,
}: {
  place: NearbyPlace
  selected: boolean
  onSelect: (id: string) => void
}) {
  const icon = useMemo(() => {
    const size = selected ? 44 : 34
    return L.divIcon({
      html: markerHtml(place.category, selected),
      className: 'hds-marker-wrap',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }, [place.category, selected])
  return (
    <Marker
      position={[place.lat, place.lng]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(place.id) }}
      alt={place.name}
    />
  )
}

const userIcon = L.divIcon({
  html: '<div class="hds-user"></div>',
  className: 'hds-user-wrap',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function UserMarker({ user }: { user: UserPosition }) {
  const radius = Math.min(user.accuracy, 400)
  return (
    <>
      {radius > 25 && (
        <Circle
          center={[user.lat, user.lng]}
          radius={radius}
          pathOptions={{ color: '#4C8DFF', weight: 1, fillColor: '#4C8DFF', fillOpacity: 0.12 }}
          interactive={false}
        />
      )}
      <Marker position={[user.lat, user.lng]} icon={userIcon} zIndexOffset={2000} interactive={false} />
    </>
  )
}

function Controller({ flyTo, onBackgroundTap }: { flyTo: FlyTo | null; onBackgroundTap: () => void }) {
  const map = useMap()

  useEffect(() => {
    map.on('click', onBackgroundTap)
    return () => {
      map.off('click', onBackgroundTap)
    }
  }, [map, onBackgroundTap])

  useEffect(() => {
    if (!flyTo) return
    // Safari có thể giữ kích thước map cũ, làm điểm đích rơi xuống dưới panel
    // pan: false để giữ nguyên tâm bản đồ khi kích thước được cập nhật
    map.invalidateSize({ animate: false, pan: false })
    if (flyTo.include) {
      map.flyToBounds(L.latLngBounds([flyTo.target.lat, flyTo.target.lng], [flyTo.include.lat, flyTo.include.lng]), {
        paddingTopLeft: [50, 90],
        paddingBottomRight: [50, map.getSize().y * PANEL_RATIO + 30],
        maxZoom: 16,
        duration: 0.6,
      })
      return
    }
    const zoom = flyTo.zoom ?? map.getZoom()
    // Đẩy tâm bản đồ xuống để điểm đích nằm ở phần map không bị panel che
    // Đo theo khung bản đồ: lúc mới mở trang, Safari có thể trả window.innerHeight sai
    const offsetY = map.getSize().y * (PANEL_RATIO / 2)
    const pt = map.project([flyTo.target.lat, flyTo.target.lng], zoom).add([0, offsetY])
    if (flyTo.instant) map.setView(map.unproject(pt, zoom), zoom, { animate: false })
    else map.flyTo(map.unproject(pt, zoom), zoom, { duration: 0.7 })
  }, [flyTo, map])

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [map])

  return null
}

/** Lớp tile có dự phòng: nếu máy chủ chính lỗi liên tiếp mà chưa tải được tile nào, đổi sang máy chủ dự phòng. */
export function Tiles() {
  const [url, setUrl] = useState(APP.tiles.url)
  const ref = useRef<L.TileLayer>(null)
  const errors = useRef(0)
  const loaded = useRef(0)

  useEffect(() => {
    const layer = ref.current
    if (!layer) return
    const onError = () => {
      errors.current += 1
      if (loaded.current === 0 && errors.current >= 3 && url === APP.tiles.url && APP.tiles.fallbackUrl) {
        setUrl(APP.tiles.fallbackUrl)
      }
    }
    const onLoad = () => {
      loaded.current += 1
    }
    layer.on('tileerror', onError)
    layer.on('tileload', onLoad)
    return () => {
      layer.off('tileerror', onError)
      layer.off('tileload', onLoad)
    }
  }, [url])

  return <TileLayer key={url} ref={ref} url={url} attribution={APP.tiles.attribution} maxZoom={19} />
}
