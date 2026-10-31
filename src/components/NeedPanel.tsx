import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, NEEDS, VEHICLE_LABEL, type Need } from '../config'
import { blockSampleCall, formatDistance, formatPrice, mapsUrl, telHref, walkMinutes } from '../lib/geo'
import type { GeoStatus } from '../lib/useGeolocation'
import { CategoryIcon, ChatIcon, ChevronIcon, PhoneIcon, RouteIcon } from './icons'
import { PlaceDetails, statusColor, statusText } from './PlaceCard'
import type { FeedbackEntry, NearbyPlace } from '../types'

const CARD = 'rounded-2xl border border-line bg-surface'

/** Khung chung: nội dung cuộn được, nút SOS luôn nằm cố định ở vùng ngón cái. */
function Shell({ children, onSos, scrollKey }: { children: React.ReactNode; onSos: () => void; scrollKey: string }) {
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    body.current?.scrollTo(0, 0)
  }, [scrollKey])
  return (
    <section className="fixed inset-x-0 bottom-0 z-20 flex h-[64dvh] flex-col rounded-t-3xl border-t border-line bg-canvas shadow-[0_-8px_24px_rgba(0,0,0,.08)]">
      <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-3">
        {children}
      </div>
      <div className="border-t border-line bg-surface px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onSos} className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-sos-500 text-lg font-black text-white active:bg-sos-600">
          <span className="rounded-full bg-white/20 px-2 py-1 text-sm">SOS</span>
          Gọi khẩn cấp
        </button>
      </div>
    </section>
  )
}

function LocationLine({ status, onLocate }: { status: GeoStatus; onLocate: () => void }) {
  if (status === 'ok') {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-ok">
        <span className="h-2 w-2 rounded-full bg-ok" />
        Đã xác định vị trí của bạn
      </p>
    )
  }
  if (status === 'locating' || status === 'idle') return <p className="text-sm text-muted">Đang tìm vị trí của bạn…</p>
  return (
    <p className="flex items-center justify-between gap-2 rounded-xl border border-accent bg-accent-soft px-3 py-1 text-sm">
      <span>Chưa có vị trí nên chưa tìm được nơi gần nhất.</span>
      <button type="button" onClick={onLocate} className="h-11 shrink-0 px-1 font-bold text-accent">
        Bật định vị
      </button>
    </p>
  )
}

interface HomeProps {
  active: NearbyPlace[]
  loading: boolean
  error: string | null
  onRetry: () => void
  geoStatus: GeoStatus
  onLocate: () => void
  onNeed: (need: Need) => void
  onBrowse: () => void
  onFeedback: () => void
  onSos: () => void
}

/** Màn đầu chỉ hỏi một câu. Người đang hoảng không cần đọc bản đồ, chỉ cần nói mình gặp chuyện gì. */
export function HomePanel({ active, loading, error, onRetry, geoStatus, onLocate, onNeed, onBrowse, onFeedback, onSos }: HomeProps) {
  return (
    <Shell onSos={onSos} scrollKey="home">
      <h2 className="text-[22px] leading-tight font-black">Bạn đang gặp chuyện gì?</h2>
      <div className="mt-1 mb-3">
        <LocationLine status={geoStatus} onLocate={onLocate} />
      </div>
      {error && (
        <div className="mb-3 rounded-2xl border border-sos-500/40 bg-sos-500/10 p-3 text-sm">
          <p className="mb-2">{error}</p>
          <button type="button" onClick={onRetry} className="h-11 rounded-xl bg-ink px-4 font-semibold text-white">
            Tải lại
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {NEEDS.map(need => {
          const open = active.filter(p => need.categories.includes(p.category)).length
          return (
            <button key={need.id} type="button" onClick={() => onNeed(need)} className={`${CARD} flex min-h-20 items-start gap-2 p-2.5 text-left active:bg-soft`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: CATEGORIES[need.icon].color, color: '#121212' }}>
                <CategoryIcon id={need.icon} size={19} strokeWidth={2.4} />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] leading-tight font-bold">{need.label}</span>
                <span className="mt-1 block text-[13px] leading-tight text-muted">
                  {loading && active.length === 0 ? 'Đang tải…' : need.hotline ? `Gọi ${need.hotline.number}` : open ? `${open} nơi đang mở` : 'Chưa có nơi mở'}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onBrowse} className="h-11 rounded-xl border border-line bg-surface text-sm font-semibold active:bg-soft">
          Xem tất cả điểm
        </button>
        <button type="button" onClick={onFeedback} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-sm font-semibold active:bg-soft">
          <ChatIcon size={16} />
          Góp ý, thêm tiệm
        </button>
      </div>
    </Shell>
  )
}

interface NeedProps {
  need: Need
  places: NearbyPlace[]
  offPlaces: NearbyPlace[]
  fallback: NearbyPlace[]
  hero: NearbyPlace | null
  loading: boolean
  geoStatus: GeoStatus
  onLocate: () => void
  onSelect: (id: string) => void
  onBack: () => void
  onSos: () => void
  onFeedback: (place: NearbyPlace) => void
  feedback: FeedbackEntry[]
}

/** Trả lời ngay: đây là nơi nên gọi. Không bắt người dùng so sánh, các nơi khác để phía dưới. */
export function NeedPanel({ need, places, offPlaces, fallback, hero, loading, geoStatus, onLocate, onSelect, onBack, onSos, onFeedback, feedback }: NeedProps) {
  const [showOff, setShowOff] = useState(false)
  const usingFallback = places.length === 0 && fallback.length > 0
  const others = (usingFallback ? fallback : places).filter(p => p.id !== hero?.id)

  return (
    <Shell onSos={onSos} scrollKey={`${need.id}-${hero?.id ?? ''}`}>
      <div className="-mt-2 mb-1 flex items-center gap-1">
        <button type="button" onClick={onBack} aria-label="Chọn việc khác" className="-ml-2 grid h-11 w-11 shrink-0 place-items-center text-ink active:bg-soft">
          <span className="-rotate-90">
            <ChevronIcon up size={22} />
          </span>
        </button>
        <h2 className="text-xl leading-tight font-black">{need.label}</h2>
      </div>
      {geoStatus !== 'ok' && (
        <div className="mb-2">
          <LocationLine status={geoStatus} onLocate={onLocate} />
        </div>
      )}

      {need.hotline && (
        <a href={telHref(need.hotline.number)} className="mb-3 flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-sos-500 px-3 py-2 text-white active:bg-sos-600">
          <PhoneIcon size={24} strokeWidth={2.4} />
          <span className="text-left leading-tight">
            <span className="block text-xl font-black">Gọi {need.hotline.number}</span>
            <span className="block text-sm">{need.hotline.label}, gọi miễn phí</span>
          </span>
        </a>
      )}

      {loading && !hero && <div className="h-44 animate-pulse rounded-2xl bg-soft" />}

      {!hero && !loading && (
        <div className={`${CARD} p-4`}>
          <p className="font-bold">Giờ này chưa có nơi nào còn mở.</p>
          <p className="mt-1 text-sm text-muted">Bấm SOS nếu bạn cần giúp ngay, hoặc gửi vị trí cho người thân từ màn SOS.</p>
        </div>
      )}

      {hero && (
        <>
          {usingFallback && (
            <p className="mb-2 rounded-xl border border-accent bg-accent-soft px-3 py-2 text-sm font-semibold">
              Giờ này chưa có {CATEGORIES[need.categories[0]].label.toLowerCase()} nào còn mở. Bạn thử gọi đội tình nguyện:
            </p>
          )}
          <HeroCard
            place={hero}
            need={need}
            geoStatus={geoStatus}
            feedback={feedback.filter(f => f.placeId === hero.id)}
            onFeedback={onFeedback}
          />
        </>
      )}

      {others.length > 0 && (
        <>
          <h3 className="mt-4 mb-2 text-base font-bold">{geoStatus === 'ok' ? 'Nơi khác gần bạn' : 'Nơi khác đang mở'}</h3>
          <ul className="space-y-2">
            {others.map(place => (
              <OtherRow key={place.id} place={place} onSelect={onSelect} />
            ))}
          </ul>
        </>
      )}

      {offPlaces.length > 0 && (
        <>
          <button type="button" onClick={() => setShowOff(v => !v)} aria-expanded={showOff} className="mt-3 flex h-11 w-full items-center justify-between rounded-xl px-1 text-sm font-semibold text-muted active:bg-soft">
            {offPlaces.length} nơi đã nghỉ giờ này
            <ChevronIcon up={showOff} size={16} />
          </button>
          {showOff && (
            <ul className="space-y-1 text-sm text-muted">
              {offPlaces.map(place => (
                <li key={place.id} className="flex justify-between gap-3 px-1 py-1">
                  <span className="min-w-0 truncate">{place.name}</span>
                  <span className="shrink-0">{statusText(place)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Shell>
  )
}

function HeroCard({ place, need, geoStatus, feedback, onFeedback }: { place: NearbyPlace; need: Need; geoStatus: GeoStatus; feedback: FeedbackEntry[]; onFeedback: (p: NearbyPlace) => void }) {
  const [details, setDetails] = useState(false)
  const walk = place.category === 'sua_xe' && !place.mobile ? walkMinutes(place.distance) : null
  const price = place.prices?.[0]

  useEffect(() => setDetails(false), [place.id])

  return (
    <article data-hero={place.id} className="rounded-2xl border-2 border-cta bg-surface p-4">
      <p className="text-xs font-bold tracking-wide text-accent uppercase">
        {need.hotline ? `Nếu chưa gọi được ${need.hotline.number}` : geoStatus === 'ok' ? 'Nên gọi trước' : 'Đang mở'}
        {place.sample && <span className="ml-2 rounded border border-accent px-1 py-px">Mẫu</span>}
      </p>
      <h3 className="mt-0.5 text-xl leading-snug font-black">{place.name}</h3>
      <p className="mt-1 text-base">
        {place.distance != null && <b>{formatDistance(place.distance)}</b>}
        {walk != null && ` · dắt xe khoảng ${walk} phút`}
      </p>
      <p className={`text-base font-semibold ${statusColor(place)}`}>{statusText(place)}</p>
      {place.mobile && <p className="mt-1 inline-block rounded bg-ok-soft px-1.5 py-0.5 text-sm font-semibold text-ok">Thợ đến tận nơi</p>}

      <a
        href={telHref(place.phone)}
        onClick={e => blockSampleCall(e, place.sample)}
        aria-label={`Gọi ${place.name}`}
        className="mt-3 flex h-16 items-center justify-center gap-3 rounded-2xl bg-cta text-ink active:bg-cta-hover"
      >
        <PhoneIcon size={24} strokeWidth={2.4} />
        <span className="text-left leading-tight">
          <span className="block text-lg font-black">Gọi ngay</span>
          <span className="block text-sm font-semibold tabular-nums">{place.phone}</span>
        </span>
      </a>
      {(price || place.rating != null) && (
        <p className="mt-2 text-sm text-muted">
          {price && (
            <>
              {price.service}: <b className="text-ink">{formatPrice(price.price, price.note)}</b>
            </>
          )}
          {price && place.rating != null && ' · '}
          {place.rating != null && <b className="text-accent">★ {place.rating.toFixed(1).replace('.', ',')}</b>}
        </p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a href={mapsUrl(place)} target="_blank" rel="noopener" aria-label={`Chỉ đường tới ${place.name}`} className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-bold active:bg-soft">
          <RouteIcon size={18} />
          Chỉ đường
        </a>
        <button type="button" onClick={() => setDetails(v => !v)} aria-expanded={details} className="flex h-12 items-center justify-center gap-1 rounded-xl border border-line text-sm font-bold active:bg-soft">
          {details ? 'Thu gọn' : 'Giá, đánh giá'}
          <ChevronIcon up={details} size={16} />
        </button>
      </div>
      {details && (
        <>
          {place.vehicles && <p className="mt-2 text-sm text-muted">Nhận sửa: {place.vehicles.map(v => VEHICLE_LABEL[v]).join(', ')}</p>}
          {place.address && <p className="mt-1 text-sm text-muted">{place.address}</p>}
          {place.note && <p className="mt-1 text-sm text-muted">{place.note}</p>}
          <PlaceDetails place={place} myFeedback={feedback} onFeedback={onFeedback} />
        </>
      )}
      {need.id === 'xe-hong' && !details && <p className="mt-2 text-sm text-muted">Nên hỏi giá trước khi thợ làm.</p>}
    </article>
  )
}

function OtherRow({ place, onSelect }: { place: NearbyPlace; onSelect: (id: string) => void }) {
  return (
    <li className={`${CARD} flex items-center gap-2 p-2 pl-3`}>
      <button type="button" onClick={() => onSelect(place.id)} className="min-h-12 min-w-0 flex-1 text-left" aria-label={`Xem ${place.name}`}>
        <span className="block truncate text-[15px] font-semibold">{place.name}</span>
        <span className="block text-sm text-muted">
          {place.distance != null && `${formatDistance(place.distance)} · `}
          <span className={statusColor(place)}>{statusText(place)}</span>
        </span>
        {place.mobile && <span className="block text-sm font-semibold text-ok">Thợ đến tận nơi</span>}
      </button>
      <a
        href={telHref(place.phone)}
        onClick={e => blockSampleCall(e, place.sample)}
        aria-label={`Gọi ${place.name}`}
        className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-cta px-3 text-sm font-bold text-ink active:bg-cta-hover"
      >
        <PhoneIcon size={18} strokeWidth={2.4} />
        Gọi
      </a>
    </li>
  )
}
