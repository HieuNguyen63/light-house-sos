import type { LatLng } from '../types'

const MAX_LINK_LENGTH = 1000
// Liệt kê đủ tên miền, không dùng mẫu chung: "google.com.evil.vn" cũng khớp mẫu google.*
const GOOGLE_DOMAINS = ['google.com', 'google.com.vn', 'google.vn']
const GOOGLE_HOSTS = new Set(GOOGLE_DOMAINS.flatMap(d => [d, `www.${d}`]))
const MAPS_HOSTS = new Set(GOOGLE_DOMAINS.map(d => `maps.${d}`))

export type ParsedLink =
  | { kind: 'coords'; link: string; position: LatLng }
  /** Link rút gọn không chứa toạ độ, trình duyệt cũng không mở ra được. Người duyệt tự mở để kiểm tra */
  | { kind: 'short'; link: string }
  | { kind: 'invalid' }

/** Chỉ nhận link Google Maps thật, vì người duyệt sẽ bấm vào link này. */
export function isGoogleMapsLink(link: string): boolean {
  if (link.length > MAX_LINK_LENGTH) return false
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase()
  if (host === 'maps.app.goo.gl' || MAPS_HOSTS.has(host)) return true
  if (host === 'goo.gl') return url.pathname.startsWith('/maps')
  return GOOGLE_HOSTS.has(host) && url.pathname.startsWith('/maps')
}

function isShortLink(link: string): boolean {
  const host = new URL(link).hostname.toLowerCase()
  return host === 'maps.app.goo.gl' || host === 'goo.gl'
}

/** Đọc link người dùng dán. Link chia sẻ thường kèm tên tiệm phía trước nên phải tách URL ra. */
export function parseMapLink(text: string): ParsedLink {
  const link = text.match(/https?:\/\/\S+/)?.[0]
  if (!link || !isGoogleMapsLink(link)) return { kind: 'invalid' }
  if (isShortLink(link)) return { kind: 'short', link }

  const decoded = decodeURIComponent(link)
  // !3d!4d là đúng điểm của tiệm; @ chỉ là tâm khung nhìn nên xếp sau
  const match =
    decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ??
    decoded.match(/[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ??
    decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (!match) return { kind: 'short', link }
  const position = { lat: Number(match[1]), lng: Number(match[2]) }
  if (Math.abs(position.lat) > 90 || Math.abs(position.lng) > 180) return { kind: 'invalid' }
  return { kind: 'coords', link, position }
}

/** Link Google Maps tự tạo từ địa chỉ chữ, không cần khoá API. */
export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/** Tìm quanh một vị trí trên Google Maps, dùng khi khu vực chưa có dữ liệu trên app. */
export function mapsNearbyUrl(query: string, near: LatLng | null): string {
  if (!near) return mapsSearchUrl(`${query} gần đây`)
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${near.lat},${near.lng},15z`
}

/** Tìm toạ độ từ địa chỉ qua Nominatim của OpenStreetMap, ưu tiên quanh người dùng. Chỉ gọi khi người dùng bấm Tìm, đúng quy định dùng dịch vụ này. */
export async function findAddress(address: string, near?: LatLng): Promise<(LatLng & { label: string }) | null> {
  const params = new URLSearchParams({ q: address, format: 'jsonv2', limit: '1', countrycodes: 'vn', 'accept-language': 'vi' })
  if (near) params.set('viewbox', `${near.lng - 0.3},${near.lat + 0.3},${near.lng + 0.3},${near.lat - 0.3}`)
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const list = (await res.json()) as { lat: string; lon: string; display_name: string }[]
  return list[0] ? { lat: Number(list[0].lat), lng: Number(list[0].lon), label: list[0].display_name } : null
}
