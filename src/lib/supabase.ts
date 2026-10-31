import type { CategoryId, FeedbackEntry, Place, PriceItem, Review, VehicleId } from '../types'

const BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** Chưa cấu hình thì app vẫn chạy, góp ý chỉ lưu trên máy. */
export const hasBackend = Boolean(BASE && KEY)

export type FeedbackStatus = 'pending' | 'approved' | 'rejected'

export interface ApprovedFeedback {
  id: string
  created_at: string
  place_id: string | null
  stars: number | null
  text: string | null
  author: string | null
}

export interface QueueItem extends ApprovedFeedback {
  kind: FeedbackEntry['kind']
  place_name: string | null
  issues: string[] | null
  new_place: Record<string, string> | null
  lat: number | null
  lng: number | null
  status: FeedbackStatus
}

function headers(token?: string): Record<string, string> {
  return { apikey: KEY!, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

export class AuthExpiredError extends Error {}

async function check(res: Response): Promise<Response> {
  if (res.status === 401) throw new AuthExpiredError()
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res
}

export async function sendFeedback(entry: FeedbackEntry): Promise<void> {
  await check(
    await fetch(`${BASE}/rest/v1/feedback`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        kind: entry.kind,
        place_id: entry.placeId ?? null,
        place_name: entry.placeName ?? null,
        stars: entry.stars ?? null,
        issues: entry.issues ?? null,
        text: entry.text ?? null,
        author: entry.author ?? null,
        new_place: entry.newPlace ?? null,
        lat: entry.position?.lat ?? null,
        lng: entry.position?.lng ?? null,
      }),
    }),
  )
}

export async function fetchApproved(): Promise<ApprovedFeedback[]> {
  const res = await check(
    await fetch(`${BASE}/rest/v1/feedback?select=id,created_at,place_id,stars,text,author&order=created_at.desc&limit=500`, {
      headers: headers(),
    }),
  )
  return res.json()
}

export async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Sai email hoặc mật khẩu')
  return ((await res.json()) as { access_token: string }).access_token
}

export async function fetchQueue(token: string, status: FeedbackStatus): Promise<QueueItem[]> {
  const res = await check(
    await fetch(`${BASE}/rest/v1/feedback?select=*&status=eq.${status}&order=created_at.desc&limit=200`, { headers: headers(token) }),
  )
  return ((await res.json()) as QueueItem[]).map(item => ({ ...item, new_place: cleanNewPlace(item.new_place) }))
}

/** Dữ liệu này do người lạ gửi: chỉ giữ ô chữ, để dữ liệu sai dạng không làm sập trang duyệt. */
function cleanNewPlace(value: unknown): Record<string, string> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === 'string')) as Record<string, string>
}

export async function setFeedbackStatus(token: string, id: string, status: FeedbackStatus): Promise<void> {
  const res = await check(
    await fetch(`${BASE}/rest/v1/feedback?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...headers(token), Prefer: 'return=representation' },
      body: JSON.stringify({ status }),
    }),
  )
  // Không có quyền duyệt thì máy chủ trả danh sách rỗng chứ không báo lỗi
  if (((await res.json()) as unknown[]).length === 0) throw new Error('Tài khoản này chưa có quyền duyệt')
}

interface PlaceRow {
  id: string
  name: string
  category: CategoryId
  phone: string | null
  lat: number
  lng: number
  address: string | null
  hours: string | null
  note: string | null
  verified_at: string | null
  mobile: boolean
  vehicles: VehicleId[] | null
  prices: PriceItem[] | null
  rating: number | null
  rating_count: number | null
  reviews: Review[] | null
  sample: boolean
  active: boolean
  source: string | null
}

export interface AdminPlace extends Place {
  active: boolean
}

function fromRow(r: PlaceRow): AdminPlace {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    phone: r.phone ?? undefined,
    lat: r.lat,
    lng: r.lng,
    address: r.address ?? undefined,
    hours: r.hours ?? undefined,
    note: r.note ?? undefined,
    verifiedAt: r.verified_at ?? undefined,
    mobile: r.mobile || undefined,
    vehicles: r.vehicles ?? undefined,
    prices: r.prices ?? undefined,
    // numeric của Postgres có thể về dạng chuỗi
    rating: r.rating == null ? undefined : Number(r.rating),
    ratingCount: r.rating_count ?? undefined,
    reviews: r.reviews ?? undefined,
    sample: r.sample || undefined,
    source: r.source ?? undefined,
    active: r.active,
  }
}

function toRow(p: Place) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    phone: p.phone ?? null,
    lat: p.lat,
    lng: p.lng,
    address: p.address ?? null,
    hours: p.hours ?? null,
    note: p.note ?? null,
    verified_at: p.verifiedAt ?? null,
    mobile: Boolean(p.mobile),
    vehicles: p.vehicles?.length ? p.vehicles : null,
    prices: p.prices?.length ? p.prices : null,
    sample: Boolean(p.sample),
  }
}

const PUBLIC_PLACE_COLUMNS = 'id,name,category,phone,lat,lng,address,hours,note,verified_at,mobile,vehicles,prices,rating,rating_count,reviews,sample,active,source'

export async function fetchPlaces(): Promise<Place[]> {
  const res = await check(await fetch(`${BASE}/rest/v1/places?select=${PUBLIC_PLACE_COLUMNS}&active=eq.true`, { headers: headers() }))
  return ((await res.json()) as PlaceRow[]).map(row => {
    const { active: _active, ...place } = fromRow(row)
    return place
  })
}

export async function fetchAllPlaces(token: string): Promise<AdminPlace[]> {
  const res = await check(await fetch(`${BASE}/rest/v1/places?select=*&order=name.asc`, { headers: headers(token) }))
  return ((await res.json()) as PlaceRow[]).map(fromRow)
}

/** Thêm hoặc sửa một điểm, trả về bản đã lưu. */
export async function savePlace(token: string, place: Place): Promise<AdminPlace> {
  const res = await check(
    await fetch(`${BASE}/rest/v1/places?on_conflict=id`, {
      method: 'POST',
      headers: { ...headers(token), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(toRow(place)),
    }),
  )
  return fromRow(((await res.json()) as PlaceRow[])[0])
}

export async function setPlaceActive(token: string, id: string, active: boolean): Promise<void> {
  const res = await check(
    await fetch(`${BASE}/rest/v1/places?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { ...headers(token), Prefer: 'return=representation' },
      body: JSON.stringify({ active }),
    }),
  )
  if (((await res.json()) as unknown[]).length === 0) throw new Error('Tài khoản này chưa có quyền sửa')
}

export async function approveNewPlace(token: string, feedbackId: string, place: Place): Promise<void> {
  await check(
    await fetch(`${BASE}/rest/v1/rpc/approve_new_place`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ p_feedback_id: feedbackId, p_place: toRow(place) }),
    }),
  )
}
