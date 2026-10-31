import { useEffect, useState } from 'react'
import { AttributionControl, MapContainer, useMap, useMapEvents } from 'react-leaflet'
import { APP } from '../config'
import { findAddress, mapsSearchUrl, parseMapLink } from '../lib/mapLink'
import { Tiles } from './MapView'
import { LocateIcon } from './icons'
import type { LatLng, UserPosition } from '../types'

export type LocationSource = 'pin' | 'gps' | 'address' | 'link'

export const LOCATION_SOURCE_LABEL: Record<LocationSource, string> = {
  pin: 'kéo ghim trên bản đồ',
  gps: 'GPS, người gửi đang đứng tại đó',
  address: 'tìm theo địa chỉ',
  link: 'link Google Maps',
}

export interface PickedLocation extends LatLng {
  source: LocationSource
}

interface Props {
  value: PickedLocation | null
  onChange: (v: PickedLocation) => void
  user: UserPosition | null
  address: string
  onAddress: (v: string) => void
  onMapLink?: (v: string) => void
  inputClass: string
}

/** Mọi cách chọn đều đưa ghim về một chỗ: người dùng nhìn bản đồ rồi kéo chỉnh lại nếu lệch. */
export function LocationPicker({ value, onChange, user, address, onAddress, onMapLink, inputClass }: Props) {
  const [target, setTarget] = useState<LatLng | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [linkText, setLinkText] = useState('')

  const jump = (position: LatLng, source: LocationSource) => {
    setTarget(position)
    onChange({ lat: position.lat, lng: position.lng, source })
  }

  const search = async () => {
    if (!address.trim() || searching) return
    setSearching(true)
    setMessage(null)
    try {
      const found = await findAddress(address.trim(), user ?? undefined)
      if (found) {
        jump(found, 'address')
        // Dịch vụ tìm địa chỉ có thể trả sai số nhà, nên phải cho người dùng đối chiếu
        setMessage(`Tìm thấy: ${found.label}. Sai chỗ thì kéo bản đồ cho đúng.`)
      } else {
        setMessage('Không tìm được địa chỉ này. Bạn kéo bản đồ để ghim đúng chỗ.')
      }
    } catch {
      setMessage('Chưa tìm được do lỗi mạng. Bạn kéo bản đồ để ghim đúng chỗ.')
    } finally {
      setSearching(false)
    }
  }

  const pasteLink = (text: string) => {
    setLinkText(text)
    if (!text.trim()) {
      onMapLink?.('')
      setMessage(null)
      return
    }
    const parsed = parseMapLink(text)
    if (parsed.kind === 'invalid') {
      onMapLink?.('')
      setMessage('Đây không phải link Google Maps.')
    } else if (parsed.kind === 'short') {
      onMapLink?.(parsed.link)
      setMessage('Đã nhận link. Link rút gọn chưa tự đặt được ghim, người duyệt sẽ mở link để kiểm tra. Bạn có thể kéo bản đồ để ghim thêm.')
    } else {
      onMapLink?.(parsed.link)
      jump(parsed.position, 'link')
      setMessage('Đã đặt ghim theo link. Kiểm tra lại, lệch thì kéo bản đồ cho đúng.')
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-bold">Vị trí</legend>

      <div>
        <label htmlFor="hds-address" className="mb-1 block text-sm font-semibold">
          Địa chỉ
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <input id="hds-address" value={address} onChange={e => onAddress(e.target.value)} autoComplete="off" className={inputClass} />
          <button type="button" onClick={search} disabled={!address.trim() || searching} className="h-12 shrink-0 rounded-xl border border-line bg-surface px-3 text-sm font-semibold active:bg-soft disabled:opacity-40">
            {searching ? 'Đang tìm…' : 'Tìm'}
          </button>
        </div>
        {address.trim() && (
          <a href={mapsSearchUrl(address.trim())} target="_blank" rel="noopener" className="mt-1 inline-block py-2 text-sm font-semibold text-accent underline">
            Mở địa chỉ này trên Google Maps
          </a>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Hoặc dán link Google Maps</span>
        <input value={linkText} onChange={e => pasteLink(e.target.value)} autoComplete="off" inputMode="url" className={inputClass} />
      </label>

      {user && (
        <button type="button" onClick={() => jump(user, 'gps')} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-semibold active:bg-soft">
          <LocateIcon size={18} />
          Tôi đang đứng tại đây
        </button>
      )}

      <div>
        <p className="mb-1 text-sm font-semibold">Hoặc kéo bản đồ để ghim đúng chỗ</p>
        <div className="relative h-52 overflow-hidden rounded-2xl border border-line">
          <MapContainer
            center={value ? [value.lat, value.lng] : user ? [user.lat, user.lng] : [APP.map.center.lat, APP.map.center.lng]}
            zoom={value ? 17 : user ? 15 : APP.map.zoom}
            zoomControl={false}
            attributionControl={false}
            touchZoom="center"
            scrollWheelZoom="center"
            doubleClickZoom="center"
            className="relative z-0 h-full w-full"
          >
            <Tiles />
            <AttributionControl position="bottomright" prefix={false} />
            <PinController target={target} onDrag={center => onChange({ ...center, source: 'pin' })} />
          </MapContainer>
          {/* Ghim đứng yên giữa khung, đầu nhọn chỉ đúng tâm bản đồ */}
          <svg aria-hidden="true" width="34" height="44" viewBox="0 0 34 44" className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full">
            <path d="M17 44S2 26 2 16a15 15 0 0 1 30 0c0 10-15 28-15 28z" fill="#C6303E" stroke="#fff" strokeWidth="2" />
            <circle cx="17" cy="16" r="5.5" fill="#fff" />
          </svg>
        </div>
      </div>

      <p role="status" className={`text-sm ${value ? 'font-semibold text-ok' : 'text-muted'}`}>
        {value ? `Đã chọn vị trí: ${LOCATION_SOURCE_LABEL[value.source]}.` : 'Chưa chọn vị trí trên bản đồ.'}
      </p>
      {message && <p className="text-sm text-muted">{message}</p>}
    </fieldset>
  )
}

function PinController({ target, onDrag }: { target: LatLng | null; onDrag: (center: LatLng) => void }) {
  const map = useMap()

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100)
    return () => clearTimeout(t)
  }, [map])

  useEffect(() => {
    if (!target) return
    map.invalidateSize({ animate: false })
    map.setView([target.lat, target.lng], 17, { animate: false })
  }, [target, map])

  useMapEvents({
    dragend: () => {
      const { lat, lng } = map.getCenter()
      onDrag({ lat, lng })
    },
  })
  return null
}
