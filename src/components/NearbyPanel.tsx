import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { CategoryChips, type Filter } from './CategoryChips'
import { PlaceCard } from './PlaceCard'
import { ChevronIcon } from './icons'
import type { GeoStatus } from '../lib/useGeolocation'
import type { FeedbackEntry, NearbyPlace } from '../types'

interface Props {
  places: NearbyPlace[]
  offPlaces: NearbyPlace[]
  loading: boolean
  error: string | null
  onRetry: () => void
  filter: Filter
  onFilter: (v: Filter) => void
  counts: Record<string, number>
  selectedId: string | null
  onSelect: (id: string) => void
  expanded: boolean
  onToggle: () => void
  geoStatus: GeoStatus
  onLocate: () => void
  onSos: () => void
  onBack: () => void
  onFeedback: (place: NearbyPlace) => void
  feedback: FeedbackEntry[]
}

const GEO_HINT: Partial<Record<GeoStatus, string>> = {
  denied: 'Định vị đang tắt. Bật để thấy điểm gần nhất.',
  unavailable: 'Chưa lấy được vị trí của bạn.',
  locating: 'Đang xác định vị trí…',
}

export function NearbyPanel(p: Props) {
  const listRef = useRef<HTMLUListElement>(null)
  const touchY = useRef<number | null>(null)
  const [showOff, setShowOff] = useState(false)

  useEffect(() => {
    if (!p.selectedId) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${p.selectedId}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [p.selectedId])

  const onTouchStart = (e: TouchEvent) => {
    touchY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: TouchEvent) => {
    if (touchY.current == null) return
    const dy = e.changedTouches[0].clientY - touchY.current
    touchY.current = null
    if ((dy < -40 && !p.expanded) || (dy > 40 && p.expanded)) p.onToggle()
  }

  const hint = GEO_HINT[p.geoStatus]

  return (
    <section
      className="fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl border-t border-line bg-surface shadow-[0_-8px_24px_rgba(0,0,0,.08)] transition-[height] duration-300 ease-out"
      style={{ height: p.expanded ? 'calc(100dvh - 88px)' : '64dvh' }}
      aria-label="Điểm cứu hộ gần bạn"
    >
      <button
        type="button"
        onClick={p.onToggle}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex h-11 w-full touch-none flex-col items-center justify-center gap-1"
        aria-label={p.expanded ? 'Thu gọn danh sách' : 'Mở rộng danh sách'}
      >
        <span className="h-1.5 w-12 rounded-full bg-line" />
        <ChevronIcon up={!p.expanded} size={16} className="text-muted" />
      </button>

      <div className="flex items-baseline justify-between px-4 pb-1">
        <button type="button" onClick={p.onBack} className="-ml-1 flex h-11 items-center gap-1 pr-2 text-base font-bold">
          <span className="-rotate-90">
            <ChevronIcon up size={16} />
          </span>
          Tất cả điểm
        </button>
        <span className="text-xs text-muted">
          {p.places.length} điểm đang mở{p.geoStatus === 'ok' ? ', gần nhất xếp trước' : ''}
        </span>
      </div>

      {hint && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl bg-soft px-3 py-2 text-sm text-muted">
          <span>{hint}</span>
          {p.geoStatus !== 'locating' && (
            <button type="button" onClick={p.onLocate} className="h-9 shrink-0 rounded-lg px-3 font-semibold text-accent">
              Thử lại
            </button>
          )}
        </div>
      )}

      <CategoryChips value={p.filter} onChange={p.onFilter} counts={p.counts} />

      <ul ref={listRef} className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pt-2 pb-3">
        {p.loading &&
          p.places.length === 0 &&
          [0, 1, 2].map(i => <li key={i} className="h-[92px] animate-pulse rounded-2xl bg-soft" />)}
        {p.error && (
          <li className="rounded-2xl border border-sos-500/40 bg-sos-500/10 p-4 text-sm">
            <p className="mb-3">{p.error}</p>
            <button type="button" onClick={p.onRetry} className="h-11 rounded-xl bg-ink px-4 font-semibold text-white">
              Tải lại
            </button>
          </li>
        )}
        {!p.loading && !p.error && p.places.length === 0 && (
          <li className="p-5 text-center text-sm text-muted">
            {p.filter === 'sua_xe' ? 'Giờ này chưa có tiệm sửa xe nào còn mở.' : 'Giờ này chưa có điểm nào còn mở trong nhóm này.'}
            {p.filter === 'sua_xe' && (
              <button
                type="button"
                onClick={() => p.onFilter('tinh_nguyen')}
                className="mx-auto mt-3 block h-11 rounded-xl border border-line px-4 font-semibold text-ink"
              >
                Xem đội tình nguyện
              </button>
            )}
          </li>
        )}
        {p.places.map(pl => (
          <PlaceCard key={pl.id} place={pl} selected={pl.id === p.selectedId} onSelect={p.onSelect} onFeedback={p.onFeedback} myFeedback={p.feedback.filter(f => f.placeId === pl.id)} />
        ))}
        {p.offPlaces.length > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setShowOff(v => !v)}
              aria-expanded={showOff}
              className="flex h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold text-muted active:bg-soft"
            >
              {p.offPlaces.length} điểm đã nghỉ giờ này
              <ChevronIcon up={showOff} size={16} />
            </button>
          </li>
        )}
        {showOff && p.offPlaces.map(pl => <PlaceCard key={pl.id} place={pl} selected={false} onSelect={p.onSelect} onFeedback={p.onFeedback} myFeedback={[]} />)}
      </ul>

      <div className="border-t border-line px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button type="button" onClick={p.onSos} className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-sos-500 text-lg font-black text-white active:bg-sos-600">
          <span className="rounded-full bg-white/20 px-2 py-1 text-sm">SOS</span>
          Gọi khẩn cấp
        </button>
      </div>
    </section>
  )
}
