import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APP, NEEDS, type Need } from './config'
import { DEMO_POSITION, DEMO_TIME, useNow } from './lib/demo'
import { distanceMeters, hoursStatus, minutesToClose } from './lib/geo'
import { useGeolocation } from './lib/useGeolocation'
import { useApprovedFeedback, useFeedback } from './lib/useFeedback'
import { useLocations } from './lib/useLocations'
import { useOnline } from './lib/useOnline'
import { type Filter } from './components/CategoryChips'
import { FeedbackSheet, type FeedbackTarget } from './components/FeedbackSheet'
import { LocateIcon } from './components/icons'
import { MapView } from './components/MapView'
import { NearbyPanel } from './components/NearbyPanel'
import { HomePanel, NeedPanel } from './components/NeedPanel'
import { SosSheet } from './components/SosSheet'
import { TopBar } from './components/TopBar'
import type { ApprovedFeedback } from './lib/supabase'
import type { FlyTo, HoursStatus, LatLng, NearbyPlace, Place } from './types'

/** Điểm còn mở xếp trước, chưa rõ giờ xếp sau vì có nguy cơ đi uổng công, đã nghỉ xếp cuối. */
const STATUS_RANK: Record<HoursStatus, number> = { always: 0, open: 0, unknown: 1, closed: 2 }

const BROWSE_HASH = 'tat-ca'

/** Cộng đánh giá đã duyệt vào điểm số và danh sách feedback của một điểm. */
function withApproved(place: Place, approved: ApprovedFeedback[]): Place {
  const mine = approved.filter(a => a.place_id === place.id)
  if (mine.length === 0) return place
  const stars = mine.flatMap(a => (a.stars ? [a.stars] : []))
  const oldCount = place.ratingCount ?? 0
  const ratingCount = oldCount + stars.length
  return {
    ...place,
    ratingCount,
    rating: ratingCount ? ((place.rating ?? 0) * oldCount + stars.reduce((s, n) => s + n, 0)) / ratingCount : place.rating,
    reviews: [
      ...mine.flatMap(a =>
        a.text ? [{ author: a.author || 'Người đi đường', stars: a.stars ?? 0, text: a.text, date: a.created_at.slice(0, 10) }] : [],
      ),
      ...(place.reviews ?? []),
    ],
  }
}

export default function App() {
  const { places, loading, error, reload } = useLocations()
  const geo = useGeolocation(!DEMO_TIME)
  const geoStatus = DEMO_TIME ? 'ok' : geo.status
  const position = DEMO_TIME ? DEMO_POSITION : geo.position
  const { locate } = geo
  const now = useNow()
  const online = useOnline()
  const { entries: feedback, submit: submitFeedback } = useFeedback()
  const approved = useApprovedFeedback()
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(null)

  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [sosOpen, setSosOpen] = useState(() => window.location.hash === '#sos')
  const [flyTo, setFlyTo] = useState<FlyTo | null>(null)
  const flyKey = useRef(0)

  const fly = useCallback((target: LatLng, zoom?: number, include?: LatLng, instant?: boolean) => {
    flyKey.current += 1
    setFlyTo({ target, zoom, include, instant, key: flyKey.current })
  }, [])

  // Màn đang xem nằm trên đuôi link: nút Back của điện thoại quay lại đúng màn trước, và in được QR riêng từng việc
  const [hash, setHash] = useState(window.location.hash)
  const movedInside = useRef(false)
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const need = useMemo(() => NEEDS.find(n => `#${n.id}` === hash) ?? null, [hash])
  const browsing = hash === `#${BROWSE_HASH}`
  const goTo = useCallback((next: string) => {
    movedInside.current = true
    setSelectedId(null)
    window.location.hash = next
  }, [])
  const goHome = useCallback(() => {
    setSelectedId(null)
    if (movedInside.current) window.history.back()
    else window.location.hash = ''
  }, [])

  const withDistance = useMemo<NearbyPlace[]>(() => {
    const list = places.map(p => ({
      ...withApproved(p, approved),
      distance: position ? distanceMeters(position, p) : null,
      status: hoursStatus(p.hours, now),
      closingIn: minutesToClose(p.hours, now),
    }))
    list.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || (a.distance ?? 0) - (b.distance ?? 0))
    return list
  }, [places, position, now, approved])

  // Quá giờ đăng ký thì off: không hiện trên bản đồ, không nằm trong danh sách chính
  const active = useMemo(() => withDistance.filter(p => p.status !== 'closed'), [withDistance])

  // Chỉ những nơi người dùng tới được mới gọi là gần. Chưa biết vị trí thì không đoán, vì dữ liệu nằm rải khắp nước
  const isNear = useCallback((p: NearbyPlace) => p.distance != null && p.distance <= APP.nearbyRadiusM, [])
  const nearActive = useMemo(() => active.filter(isNear), [active, isNear])
  const hasNearData = useMemo(() => withDistance.some(isNear), [withDistance, isNear])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: active.length }
    for (const p of active) c[p.category] = (c[p.category] ?? 0) + 1
    return c
  }, [active])

  const visible = useMemo(() => {
    // Theo thứ tự ưu tiên của việc đó: tai nạn thì xe cấp cứu trước, không để nhà thuốc đứng đầu chỉ vì gần hơn
    if (need) {
      const rank = (p: NearbyPlace) => need.categories.indexOf(p.category)
      return nearActive.filter(p => rank(p) >= 0).sort((a, b) => rank(a) - rank(b))
    }
    return browsing && filter !== 'all' ? active.filter(p => p.category === filter) : active
  }, [active, nearActive, filter, need, browsing])
  const offPlaces = useMemo(() => {
    const closed = withDistance.filter(p => p.status === 'closed')
    if (need) return closed.filter(p => isNear(p) && need.categories.includes(p.category))
    return filter === 'all' ? closed : closed.filter(p => p.category === filter)
  }, [withDistance, filter, need, isNear])
  // Không còn nơi nào mở thì gợi ý nhóm dự phòng, để người dùng không đứng trước một màn trống
  const fallback = useMemo(() => (need?.fallback && visible.length === 0 ? nearActive.filter(p => p.category === need.fallback) : []), [need, visible, nearActive])
  const options = visible.length ? visible : fallback
  const hero = need ? options.find(p => p.id === selectedId) ?? options[0] ?? null : null
  const mapPlaces = need && visible.length === 0 ? fallback : visible
  const nearest = useMemo(() => nearActive.slice(0, 3), [nearActive])
  // Ở nơi chưa có dữ liệu thì không có số mẫu nào trước mắt, không cần cảnh báo
  const hasSample = useMemo(() => (browsing || !position || hasNearData) && places.some(p => p.sample), [places, browsing, position, hasNearData])

  // Bay tới vị trí người dùng lần đầu tiên xác định được
  const flewOnce = useRef(false)
  useEffect(() => {
    if (position && !flewOnce.current) {
      flewOnce.current = true
      // Ngay lúc mở app bản đồ còn đang đo kích thước, hiệu ứng bay làm Safari lệch tâm nên đặt thẳng
      fly(position, 15, undefined, true)
    }
  }, [position, fly])

  // Chọn việc hoặc chọn nơi khác: bản đồ cho thấy cả người dùng lẫn nơi cần đến
  const heroId = hero?.id ?? null
  useEffect(() => {
    if (!heroId) return
    const p = places.find(x => x.id === heroId)
    if (!p) return
    fly(p, 15, position ?? undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId])

  const selectFromMap = useCallback((id: string) => setSelectedId(id), [])

  const handleSelect = useCallback(
    (id: string, zoom = 16) => {
      setSelectedId(id)
      setExpanded(false)
      const p = places.find(x => x.id === id)
      if (p) fly(p, zoom)
    },
    [places, fly],
  )
  const clearSelect = useCallback(() => setSelectedId(null), [])
  const handleLocate = useCallback(() => {
    locate()
    if (position) fly(position, 16)
  }, [locate, position, fly])
  const openNeed = useCallback((n: Need) => goTo(n.id), [goTo])
  const openBrowse = useCallback(() => goTo(BROWSE_HASH), [goTo])
  const toggleExpanded = useCallback(() => setExpanded(e => !e), [])
  const openSos = useCallback(() => setSosOpen(true), [])
  const closeSos = useCallback(() => setSosOpen(false), [])
  const openGeneralFeedback = useCallback(() => setFeedbackTarget({ place: null }), [])
  const openPlaceFeedback = useCallback((place: NearbyPlace) => setFeedbackTarget({ place }), [])
  const closeFeedback = useCallback(() => setFeedbackTarget(null), [])

  return (
    <div className="fixed inset-0 overflow-hidden bg-canvas text-ink">
      <MapView
        places={mapPlaces}
        selectedId={need ? heroId : selectedId}
        onSelect={need ? selectFromMap : handleSelect}
        onClearSelect={clearSelect}
        user={position}
        flyTo={flyTo}
      />
      <TopBar online={online} hasSample={hasSample} />

      {!expanded && (
        <button
          type="button"
          onClick={handleLocate}
          className="fixed right-4 z-20 grid h-12 w-12 place-items-center rounded-full border border-line bg-surface/95 shadow-lg active:bg-soft"
          style={{ bottom: 'calc(64dvh + 12px)' }}
          aria-label="Về vị trí của tôi"
        >
          <LocateIcon
            size={22}
            className={
              geoStatus === 'ok' ? 'text-accent' : geoStatus === 'locating' ? 'animate-pulse text-muted' : 'text-ink'
            }
          />
        </button>
      )}

      {!need && !browsing && (
        <HomePanel
          active={nearActive}
          noNearData={geoStatus === 'ok' && !loading && !hasNearData}
          loading={loading}
          error={error}
          onRetry={reload}
          geoStatus={geoStatus}
          onLocate={handleLocate}
          onNeed={openNeed}
          onBrowse={openBrowse}
          onFeedback={openGeneralFeedback}
          onSos={openSos}
        />
      )}
      {need && (
        <NeedPanel
          need={need}
          position={position}
          onAddPlace={openGeneralFeedback}
          places={visible}
          offPlaces={offPlaces}
          fallback={fallback}
          hero={hero}
          loading={loading}
          geoStatus={geoStatus}
          onLocate={handleLocate}
          onSelect={selectFromMap}
          onBack={goHome}
          onSos={openSos}
          onFeedback={openPlaceFeedback}
          feedback={feedback}
        />
      )}
      {browsing && <NearbyPanel
        places={visible}
        offPlaces={offPlaces}
        loading={loading}
        error={error}
        onRetry={reload}
        filter={filter}
        onFilter={setFilter}
        counts={counts}
        selectedId={selectedId}
        onSelect={handleSelect}
        expanded={expanded}
        onToggle={toggleExpanded}
        geoStatus={geoStatus}
        onLocate={handleLocate}
        onSos={openSos}
        onBack={goHome}
        onFeedback={openPlaceFeedback}
        feedback={feedback}
      />}

      <SosSheet open={sosOpen} onClose={closeSos} user={position} geoStatus={geoStatus} onLocate={handleLocate} nearest={nearest} />
      <FeedbackSheet target={feedbackTarget} onClose={closeFeedback} onSubmit={submitFeedback} entries={feedback} user={position} />
    </div>
  )
}
