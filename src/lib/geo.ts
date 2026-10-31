import type { HoursStatus, LatLng } from '../types'

const EARTH_RADIUS_M = 6_371_000

export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s))
}

export function formatDistance(m: number | null): string {
  if (m == null) return ''
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0).replace('.', ',')} km`
}

/** Đọc chuỗi giờ mở cửa. Hỗ trợ "24/7" và "HH:MM-HH:MM" kể cả qua đêm. */
export function hoursStatus(hours: string | undefined, now = new Date()): HoursStatus {
  if (!hours) return 'unknown'
  if (hours.trim() === '24/7') return 'always'
  const range = parseRange(hours)
  if (!range) return 'unknown'
  const { open, close } = range
  const cur = minutesOfDay(now)
  const isOpen = open <= close ? cur >= open && cur < close : cur >= open || cur < close
  return isOpen ? 'open' : 'closed'
}

/** Còn bao nhiêu phút tới giờ nghỉ. Null nếu mở 24/7, đã nghỉ hoặc chưa rõ giờ. */
export function minutesToClose(hours: string | undefined, now = new Date()): number | null {
  if (hoursStatus(hours, now) !== 'open') return null
  const { close } = parseRange(hours!)!
  return (close - minutesOfDay(now) + 24 * 60) % (24 * 60)
}

/** Giờ mở và giờ nghỉ dạng "HH:MM" để hiển thị. */
export function hoursParts(hours: string | undefined): { opens: string; closes: string } | null {
  if (!hours || !parseRange(hours)) return null
  const [opens, closes] = hours.split('-').map(s => s.trim())
  return { opens, closes }
}

function parseRange(hours: string): { open: number; close: number } | null {
  const m = hours.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
  return m ? { open: Number(m[1]) * 60 + Number(m[2]), close: Number(m[3]) * 60 + Number(m[4]) } : null
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

export function mapsUrl(p: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
}

export function pointUrl(p: LatLng): string {
  return `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function formatPrice(price: number | null, note?: string): string {
  if (price === 0) return 'Miễn phí'
  if (price == null) return note ?? 'Hỏi giá'
  return `${price.toLocaleString('vi-VN')}đ`
}

const WALK_METERS_PER_MINUTE = 60

/** Thời gian dắt xe, chỉ tính khi đủ gần để dắt bộ. Khoảng cách là đường chim bay nên chỉ là ước lượng. */
export function walkMinutes(m: number | null): number | null {
  if (m == null || m > 5000) return null
  return Math.max(1, Math.ceil(m / WALK_METERS_PER_MINUTE))
}

/** Số mẫu có thể trùng số thật của người lạ: chặn không cho gọi. */
export function blockSampleCall(e: { preventDefault: () => void }, sample?: boolean) {
  if (!sample) return
  e.preventDefault()
  window.alert('Đây là số mẫu của bản demo, chưa gọi được.')
}

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
