import { memo } from 'react'
import { CATEGORIES, VEHICLE_LABEL } from '../config'
import { blockSampleCall, formatDay, formatDistance, formatPrice, hoursParts, mapsUrl, telHref, walkMinutes } from '../lib/geo'
import { feedbackStateText } from './FeedbackSheet'
import { CategoryIcon, ChatIcon, PhoneIcon, RouteIcon } from './icons'
import type { FeedbackEntry, NearbyPlace } from '../types'

interface Props {
  place: NearbyPlace
  selected: boolean
  onSelect: (id: string) => void
  onFeedback: (place: NearbyPlace) => void
  myFeedback: FeedbackEntry[]
}

const CLOSING_SOON_MINUTES = 30

export function statusText(place: NearbyPlace): string {
  const parts = hoursParts(place.hours)
  if (place.status === 'always') return 'Mở 24/7'
  if (place.status === 'unknown') return 'Chưa rõ giờ, nên gọi trước'
  if (place.status === 'closed') return `Đã nghỉ · mở lại ${parts?.opens}`
  if (place.closingIn != null && place.closingIn <= CLOSING_SOON_MINUTES) return `Sắp nghỉ · còn ${place.closingIn} phút`
  return `Mở đến ${parts?.closes}`
}

export function statusColor(place: NearbyPlace): string {
  if (place.status === 'closed' || place.status === 'unknown') return 'text-muted'
  return place.closingIn != null && place.closingIn <= CLOSING_SOON_MINUTES ? 'text-accent' : 'text-ok'
}

/** Đơn giá, feedback, nút góp ý: phần mở rộng của một điểm. */
export function PlaceDetails({ place, myFeedback, onFeedback, indent }: { place: NearbyPlace; myFeedback: FeedbackEntry[]; onFeedback: (place: NearbyPlace) => void; indent?: boolean }) {
  // Thẻ danh sách có icon bên trái nên nội dung thụt theo; thẻ lớn không có icon
  const pad = indent ? 'pl-[52px]' : ''
  return (
    <>
      {place.prices && place.prices.length > 0 && (
        <div className={`mt-2 border-t border-line pt-2 ${pad}`}>
          <h4 className="mb-1 text-sm font-bold">Đơn giá tham khảo</h4>
          <ul className="space-y-1 text-sm">
            {place.prices.map(item => (
              <li key={item.service}>
                <span className="flex justify-between gap-3">
                  <span className="text-muted">{item.service}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatPrice(item.price, item.note)}</span>
                </span>
                {item.price != null && item.note && <span className="block text-xs text-muted">{item.note}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">Nên hỏi lại giá trước khi làm.</p>
        </div>
      )}
      {place.reviews && place.reviews.length > 0 && (
        <ul className={`mt-2 space-y-2 border-t border-line pt-2 ${pad}`}>
          {place.reviews.map((r, i) => (
            <li key={`${r.author}-${r.date}-${i}`} className="text-sm">
              <p className="text-ink">{r.text}</p>
              <p className="text-xs text-muted">
                <span className="text-accent">{'★'.repeat(r.stars)}</span> {r.author} · {formatDay(r.date)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {myFeedback.length > 0 && (
        <ul className={`mt-2 space-y-2 border-t border-line pt-2 ${pad}`}>
          {myFeedback.map(f => (
            <li key={f.id} className="text-sm">
              {f.stars && <span className="text-accent">{'★'.repeat(f.stars)} </span>}
              {f.issues && <span className="font-semibold">{f.issues.join(', ')}. </span>}
              {f.text}
              <span className="block text-xs text-muted">Góp ý của bạn · {feedbackStateText(f)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={`mt-2 ${pad}`}>
          <button
            type="button"
            onClick={() => onFeedback(place)}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-sm font-semibold active:bg-soft"
          >
            <ChatIcon size={16} />
            Đánh giá hoặc báo sai
          </button>
        </div>
    </>
  )
}

export const PlaceCard = memo(function PlaceCard({ place, selected, onSelect, onFeedback, myFeedback }: Props) {
  const cat = CATEGORIES[place.category]
  const off = place.status === 'closed'
  // Thợ đến tận nơi thì không cần dắt xe
  const walk = place.category === 'sua_xe' && !place.mobile ? walkMinutes(place.distance) : null
  const firstPrice = place.prices?.[0]

  return (
    <li
      data-id={place.id}
      className={`rounded-2xl border p-3 transition-colors ${
        selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
      } ${off ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={off}
          onClick={() => onSelect(place.id)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-label={off ? `${place.name}, đã nghỉ` : `Xem ${place.name} trên bản đồ`}
        >
          <span
            className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{ background: cat.color, color: '#121212' }}
          >
            <CategoryIcon id={place.category} size={20} strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[15px] font-semibold text-ink">{place.name}</span>
            <span className="mt-0.5 block text-sm text-muted">
              {place.distance != null && (
                <span className="font-semibold text-ink">
                  {formatDistance(place.distance)}
                  {walk != null && ` · dắt khoảng ${walk} phút`}
                </span>
              )}
              <span className={`block ${statusColor(place)}`}>{statusText(place)}</span>
            </span>
            {firstPrice && (
              <span className="mt-0.5 block text-sm text-muted">
                {firstPrice.service}: <span className="font-semibold text-ink">{formatPrice(firstPrice.price, firstPrice.note)}</span>
              </span>
            )}
            {place.rating != null && (
              <span className="mt-0.5 block text-sm text-muted">
                <span className="font-semibold text-accent">★ {place.rating.toFixed(1).replace('.', ',')}</span>
                {place.ratingCount != null && ` · ${place.ratingCount} đánh giá`}
              </span>
            )}
            {place.address && <span className="mt-0.5 block truncate text-sm text-muted">{place.address}</span>}
          </span>
        </button>
        {!off && <div className="flex shrink-0 flex-col gap-2">
          <a
            href={telHref(place.phone)}
            onClick={e => blockSampleCall(e, place.sample)}
            className="flex h-12 items-center gap-1.5 rounded-xl bg-cta px-3 text-sm font-bold text-ink active:bg-cta-hover"
            aria-label={`Gọi ${place.name}`}
          >
            <PhoneIcon size={18} strokeWidth={2.4} />
            Gọi
          </a>
          <a
            href={mapsUrl(place)}
            target="_blank"
            rel="noopener"
            className="flex h-11 items-center justify-center gap-1 rounded-xl border border-line px-1 text-xs font-semibold text-ink active:bg-soft"
            aria-label={`Chỉ đường tới ${place.name}`}
          >
            <RouteIcon size={14} />
            Đường đi
          </a>
        </div>}
      </div>
      {(place.sample || place.mobile || place.verifiedAt || place.vehicles) && (
        <p className="mt-2 flex flex-wrap gap-1.5 pl-[52px] text-xs font-semibold">
          {place.sample && <span className="rounded border border-accent px-1.5 py-0.5 uppercase text-accent">Mẫu</span>}
          {place.mobile && <span className="rounded bg-ok-soft px-1.5 py-0.5 text-ok">Đến tận nơi</span>}
          {place.vehicles?.map(v => (
            <span key={v} className="rounded bg-soft px-1.5 py-0.5 text-muted">{VEHICLE_LABEL[v]}</span>
          ))}
          {place.verifiedAt && (
            <span className="rounded bg-line px-1.5 py-0.5 text-muted">Đã gọi xác minh {formatDay(place.verifiedAt)}</span>
          )}
        </p>
      )}
      {place.note && <p className="mt-2 pl-[52px] text-sm text-muted">{place.note}</p>}
      {selected && <PlaceDetails place={place} myFeedback={myFeedback} onFeedback={onFeedback} indent />}
    </li>
  )
})
