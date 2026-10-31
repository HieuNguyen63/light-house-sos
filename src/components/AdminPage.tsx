import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { APP, CATEGORIES } from '../config'
import { formatPrice, telHref } from '../lib/geo'
import { isGoogleMapsLink, mapsSearchUrl } from '../lib/mapLink'
import {
  approveNewPlace,
  AuthExpiredError,
  fetchAllPlaces,
  fetchQueue,
  hasBackend,
  savePlace,
  setFeedbackStatus,
  setPlaceActive,
  signIn,
  type AdminPlace,
  type FeedbackStatus,
  type QueueItem,
} from '../lib/supabase'
import { LOCATION_SOURCE_LABEL, type LocationSource } from './LocationPicker'
import { PlaceForm } from './PlaceForm'
import type { Place, PriceItem } from '../types'

type Tab = FeedbackStatus | 'places'

const INPUT = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink'
const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'places', label: 'Danh sách điểm' },
]
const KIND_LABEL: Record<QueueItem['kind'], string> = { place: 'Đánh giá', app: 'Góp ý cho app', new_place: 'Đề xuất điểm mới' }
const NEW_PLACE_LABEL: Record<string, string> = { name: 'Tên', phone: 'Điện thoại', hours: 'Giờ làm', price: 'Đơn giá', address: 'Địa chỉ' }
const STATUS_DONE: Record<FeedbackStatus, string> = { pending: 'Đưa về chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối' }

/** Đánh giá có sao hoặc nội dung thì duyệt xong sẽ hiện công khai. */
function isPublic(item: QueueItem): boolean {
  return item.kind === 'place' && (item.stars != null || Boolean(item.text))
}

/** Nói rõ bấm Duyệt sẽ xảy ra gì, vì mỗi loại góp ý có hậu quả khác nhau. */
function approveEffect(item: QueueItem): string {
  if (item.kind === 'app') return 'Không hiện công khai. Duyệt nghĩa là đã xem.'
  if (item.kind === 'new_place') return 'Gọi xác minh, kiểm tra thông tin và ghim. Duyệt xong điểm lên bản đồ cho mọi người ngay.'
  const facts = item.issues?.length ? ' Phần báo sai không công khai và không tự sửa thông tin tiệm: gọi kiểm tra rồi bấm Sửa thông tin tiệm.' : ''
  return (isPublic(item) ? 'Số sao và nội dung sẽ hiện công khai trên thẻ tiệm.' : 'Không có gì để hiện công khai.') + facts
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Đổi đơn giá người dùng gõ tự do ("Vá xe 30.000đ", "30k") thành dòng giá để người duyệt sửa tiếp. */
function priceFromText(text: string | undefined): PriceItem[] {
  if (!text?.trim()) return []
  const match = text.match(/(\d[\d.,]*)\s*(k\b)?/i)
  const amount = match ? Number(match[1].replace(/[.,]/g, '')) * (match[2] ? 1000 : 1) : null
  const service = (match ? text.slice(0, match.index) : text).trim()
  return [{ service: service || 'Vá xe', price: amount }]
}

function draftFromProposal(item: QueueItem): Partial<Place> {
  const n = item.new_place ?? {}
  return {
    name: n.name || item.place_name || '',
    phone: n.phone || '',
    hours: n.hours || undefined,
    address: n.address || undefined,
    note: item.text || undefined,
    prices: priceFromText(n.price),
    lat: item.lat ?? undefined,
    lng: item.lng ?? undefined,
  }
}

type FormState = { mode: 'proposal'; item: QueueItem } | { mode: 'edit'; place: Place } | { mode: 'add' }

/** Trang duyệt góp ý và quản lý danh sách điểm, mở bằng link #duyet. Phiên đăng nhập chỉ giữ trong bộ nhớ, tải lại trang phải đăng nhập lại. */
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tab, setTab] = useState<Tab>('pending')
  const [items, setItems] = useState<QueueItem[]>([])
  const [places, setPlaces] = useState<AdminPlace[]>([])
  const [placesError, setPlacesError] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [last, setLast] = useState<{ id: string; text: string; from: FeedbackStatus } | null>(null)

  const fail = useCallback((e: unknown) => {
    if (e instanceof AuthExpiredError) {
      setToken(null)
      setError('Phiên đăng nhập đã hết, vui lòng đăng nhập lại.')
    } else {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra')
    }
  }, [])

  useEffect(() => {
    if (!token || tab === 'places') return
    let active = true
    setLoading(true)
    setError(null)
    fetchQueue(token, tab)
      .then(list => active && setItems(list))
      .catch(e => active && fail(e))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [token, tab, fail, reload])

  useEffect(() => {
    if (!token) return
    fetchAllPlaces(token)
      .then(list => {
        setPlaces(list)
        setPlacesError(false)
      })
      .catch(e => {
        if (e instanceof AuthExpiredError) fail(e)
        else setPlacesError(true)
      })
  }, [token, fail, reload])

  const login = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      setToken(await signIn(email.trim(), password))
      setPassword('')
    } catch (err) {
      fail(err)
    } finally {
      setLoading(false)
    }
  }

  const decide = async (item: QueueItem, status: FeedbackStatus) => {
    setError(null)
    try {
      await setFeedbackStatus(token!, item.id, status)
      setItems(list => list.filter(i => i.id !== item.id))
      setLast({ id: item.id, text: `${STATUS_DONE[status]}: ${KIND_LABEL[item.kind]}${item.place_name ? `: ${item.place_name}` : ''}`, from: tab as FeedbackStatus })
      setReload(n => n + 1)
    } catch (e) {
      fail(e)
    }
  }

  const undo = async () => {
    if (!last) return
    setError(null)
    try {
      await setFeedbackStatus(token!, last.id, last.from)
      setTab(last.from)
      setLast(null)
      setReload(n => n + 1)
    } catch (e) {
      fail(e)
    }
  }

  // Lỗi hết phiên phải đưa về đăng nhập; lỗi khác để form hiện tại chỗ
  const saveForm = async (place: Place) => {
    try {
      if (form?.mode === 'proposal') {
        await approveNewPlace(token!, form.item.id, place)
        setItems(list => list.filter(i => i.id !== form.item.id))
        setLast({ id: form.item.id, text: `Đã đưa lên bản đồ: ${place.name}`, from: tab as FeedbackStatus })
      } else {
        await savePlace(token!, place)
      }
      setForm(null)
      setReload(n => n + 1)
    } catch (e) {
      if (e instanceof AuthExpiredError) {
        setForm(null)
        fail(e)
      } else {
        throw e
      }
    }
  }

  const toggleActive = async (place: AdminPlace) => {
    setError(null)
    try {
      await setPlaceActive(token!, place.id, !place.active)
      setReload(n => n + 1)
    } catch (e) {
      fail(e)
    }
  }

  const shownPlaces = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? places.filter(p => `${p.name} ${p.phone} ${p.address ?? ''}`.toLowerCase().includes(q)) : places
  }, [places, search])

  return (
    <div className="fixed inset-0 overflow-y-auto bg-canvas text-ink">
      <div className="mx-auto max-w-2xl px-4 pt-5 pb-28">
        <h1 className="text-[22px] font-bold">Duyệt góp ý · {APP.name}</h1>
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-sos-500/40 bg-sos-500/10 p-3 text-sm">
            {error}
          </p>
        )}

        {!hasBackend ? (
          <p className="mt-4 text-sm text-muted">Chưa cấu hình máy chủ góp ý.</p>
        ) : !token ? (
          <form onSubmit={login} className="mt-4 space-y-3 rounded-2xl border border-line bg-surface p-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Email</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Mật khẩu</span>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className={INPUT} />
            </label>
            <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-cta font-bold text-ink active:bg-cta-hover disabled:opacity-40">
              Đăng nhập
            </button>
          </form>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Trang quản lý">
              {TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => {
                    setTab(t.id)
                    setLast(null)
                  }}
                  className={`h-11 rounded-full border px-4 text-sm font-semibold ${tab === t.id ? 'border-cta bg-cta' : 'border-line bg-surface'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {placesError && (
              <p className="mt-3 rounded-xl border border-accent bg-accent-soft p-3 text-sm">
                Chưa đọc được danh sách điểm. Nếu chưa chạy file <b>003-places.sql</b> trong SQL Editor thì chạy trước, nếu đã chạy thì kiểm tra mạng.
              </p>
            )}

            {tab === 'places' ? (
              <>
                <button type="button" onClick={() => setForm({ mode: 'add' })} className="mt-3 h-12 w-full rounded-xl bg-cta font-bold active:bg-cta-hover">
                  Thêm điểm mới
                </button>
                <label className="mt-3 block">
                  <span className="mb-1 block text-sm font-semibold">Tìm theo tên, số điện thoại, địa chỉ</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" className={INPUT} />
                </label>
                <p className="mt-3 text-sm text-muted">{shownPlaces.length} điểm</p>
                <ul className="mt-2 space-y-2">
                  {shownPlaces.map(place => (
                    <li key={place.id} data-place={place.id} className={`rounded-2xl border border-line bg-surface p-3 text-sm ${place.active ? '' : 'opacity-60'}`}>
                      <p className="font-bold">
                        {place.name}
                        {!place.active && <span className="ml-2 rounded bg-line px-1.5 py-0.5 text-xs">Đang ẩn</span>}
                        {place.sample && <span className="ml-2 rounded border border-accent px-1.5 py-0.5 text-xs uppercase text-accent">Mẫu</span>}
                      </p>
                      <p className="text-muted">
                        {CATEGORIES[place.category]?.label} · {place.phone} · {place.hours ?? 'Chưa rõ giờ'}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setForm({ mode: 'edit', place })} className="h-11 rounded-xl border border-line font-semibold active:bg-soft">
                          Sửa
                        </button>
                        <button type="button" onClick={() => toggleActive(place)} className="h-11 rounded-xl border border-line font-semibold active:bg-soft">
                          {place.active ? 'Ẩn khỏi bản đồ' : 'Hiện lại'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                {loading && <p className="mt-4 text-sm text-muted">Đang tải…</p>}
                {!loading && items.length === 0 && <p className="mt-4 text-sm text-muted">Không có góp ý nào.</p>}
                {!loading && items.length > 0 && <p className="mt-3 text-sm text-muted">{items.length} góp ý, mới nhất ở trên</p>}
                <ul className="mt-2 space-y-3">
                  {items.map(item => {
                    const place = places.find(p => p.id === item.place_id)
                    return (
                      <li key={item.id} className="rounded-2xl border border-line bg-surface p-4 text-sm">
                        <p className="font-bold">
                          {KIND_LABEL[item.kind]}
                          {item.place_name && `: ${item.place_name}`}
                        </p>
                        <p className="text-xs text-muted">
                          {formatTime(item.created_at)}
                          {' · '}
                          {item.author || 'Không để tên'}
                        </p>
                        {item.stars != null && <p className="mt-1 text-accent">{'★'.repeat(item.stars)}</p>}
                        {item.issues && item.issues.length > 0 && <p className="mt-1 font-semibold">Báo sai: {item.issues.join(', ')}</p>}
                        {item.text && <p className="mt-1 whitespace-pre-wrap">{item.text}</p>}
                        {!item.stars && !item.issues?.length && !item.text && !item.new_place && <p className="mt-1 text-muted">Góp ý này không có nội dung.</p>}
                        {place && (
                          <div className="mt-2 rounded-xl bg-soft p-3">
                            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Đang hiện trên app</p>
                            <p>
                              Điện thoại:{' '}
                              {place.sample ? (
                                `${place.phone} (số mẫu)`
                              ) : (
                                <a href={telHref(place.phone)} className="font-semibold text-accent underline">
                                  {place.phone}
                                </a>
                              )}
                            </p>
                            <p>Giờ làm: {place.hours ?? 'Chưa rõ'}</p>
                            {place.address && <p>Địa chỉ: {place.address}</p>}
                            {place.prices?.map(price => (
                              <p key={price.service}>
                                {price.service}: {formatPrice(price.price, price.note)}
                              </p>
                            ))}
                            <a href={`https://maps.google.com/?q=${place.lat},${place.lng}`} target="_blank" rel="noopener" className="font-semibold text-accent underline">
                              Xem tiệm trên bản đồ
                            </a>
                            <button type="button" onClick={() => setForm({ mode: 'edit', place })} className="mt-2 block h-11 w-full rounded-xl border border-line bg-surface font-semibold active:bg-soft">
                              Sửa thông tin tiệm
                            </button>
                          </div>
                        )}
                        {item.new_place && (
                          <dl className="mt-1">
                            {Object.entries(item.new_place)
                              .filter(([k]) => k !== 'mapLink' && k !== 'source')
                              .filter(([, v]) => v)
                              .map(([k, v]) => (
                                <div key={k}>
                                  <dt className="inline text-muted">{NEW_PLACE_LABEL[k] ?? k}: </dt>
                                  <dd className="inline">{v}</dd>
                                </div>
                              ))}
                          </dl>
                        )}
                        {item.lat != null && item.lng != null && (
                          <a href={`https://maps.google.com/?q=${item.lat},${item.lng}`} target="_blank" rel="noopener" className="mt-1 block py-1 font-semibold text-accent underline">
                            Xem vị trí ghim trên Google Maps
                            {item.new_place?.source && ` (${LOCATION_SOURCE_LABEL[item.new_place.source as LocationSource] ?? 'không rõ cách chọn'})`}
                          </a>
                        )}
                        {item.new_place?.address && (
                          <a href={mapsSearchUrl(item.new_place.address)} target="_blank" rel="noopener" className="block py-1 font-semibold text-accent underline">
                            Tìm địa chỉ trên Google Maps
                          </a>
                        )}
                        {item.new_place?.mapLink && isGoogleMapsLink(item.new_place.mapLink) && (
                          <a href={item.new_place.mapLink} target="_blank" rel="noopener" className="block py-1 font-semibold text-accent underline">
                            Mở link người gửi dán
                          </a>
                        )}
                        {item.kind === 'new_place' && item.lat == null && !item.new_place?.address && !item.new_place?.mapLink && (
                          <p className="mt-1 font-semibold text-accent">Góp ý này chưa có vị trí.</p>
                        )}
                        {tab !== 'approved' && (
                          <p className="mt-2 text-xs text-muted">
                            <span className="font-bold">Nếu duyệt:</span> {approveEffect(item)}
                          </p>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {tab !== 'approved' &&
                            (item.kind === 'new_place' ? (
                              <button type="button" onClick={() => setForm({ mode: 'proposal', item })} className="min-h-11 rounded-xl bg-cta px-2 py-1 font-bold active:bg-cta-hover">
                                Kiểm tra và duyệt
                              </button>
                            ) : (
                              <button type="button" onClick={() => decide(item, 'approved')} className="min-h-11 rounded-xl bg-cta px-2 py-1 font-bold active:bg-cta-hover">
                                {isPublic(item) ? 'Duyệt và công khai' : 'Đã xem'}
                              </button>
                            ))}
                          {tab !== 'rejected' && (
                            <button type="button" onClick={() => decide(item, 'rejected')} className="min-h-11 rounded-xl border border-line px-2 py-1 font-semibold active:bg-soft">
                              {tab === 'approved' && item.kind === 'new_place' ? 'Từ chối và gỡ khỏi bản đồ' : 'Từ chối'}
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {last && (
        <div role="status" className="fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-ink px-4 py-2 text-sm text-white shadow-lg">
          <span className="min-w-0 flex-1">{last.text}</span>
          <button type="button" onClick={undo} className="h-11 shrink-0 rounded-xl bg-white px-3 font-bold text-ink">
            Hoàn tác
          </button>
        </div>
      )}

      {form && (
        <PlaceForm
          title={form.mode === 'proposal' ? 'Kiểm tra đề xuất' : form.mode === 'edit' ? `Sửa: ${form.place.name}` : 'Thêm điểm mới'}
          submitLabel={form.mode === 'proposal' ? 'Duyệt và đưa lên bản đồ' : 'Lưu'}
          initial={form.mode === 'proposal' ? draftFromProposal(form.item) : form.mode === 'edit' ? form.place : {}}
          onSubmit={saveForm}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  )
}
