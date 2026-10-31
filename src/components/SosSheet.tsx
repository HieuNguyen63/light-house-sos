import { useEffect, useState } from 'react'
import { APP, CATEGORIES, HOTLINES, LOCAL_HOTLINES, type Hotline } from '../config'
import { blockSampleCall, formatDistance, pointUrl, telHref } from '../lib/geo'
import type { GeoStatus } from '../lib/useGeolocation'
import { CategoryIcon, CloseIcon, LocateIcon, PhoneIcon, ShareIcon } from './icons'
import type { NearbyPlace, UserPosition } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  user: UserPosition | null
  geoStatus: GeoStatus
  onLocate: () => void
  nearest: NearbyPlace[]
}

const TONE: Record<Hotline['tone'], string> = {
  red: 'bg-sos-500 text-white',
  blue: 'bg-[#1F5FD0] text-white',
  orange: 'bg-accent text-white',
  amber: 'bg-cta text-ink',
}

function HotlineGrid({ items }: { items: Hotline[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(h => (
        <a
          key={h.number}
          href={telHref(h.number)}
          className={`flex min-h-24 flex-col items-center justify-center rounded-2xl px-2 py-3 text-center active:opacity-80 ${TONE[h.tone]}`}
        >
          <span className="text-3xl font-black leading-none">{h.number}</span>
          <span className="mt-1.5 text-sm font-semibold">{h.label}</span>
          <span className="text-xs opacity-80">{h.desc}</span>
        </a>
      ))}
    </div>
  )
}

export function SosSheet({ open, onClose, user, geoStatus, onLocate, nearest }: Props) {
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  if (!open) return null

  const share = async () => {
    if (!user) return
    const link = pointUrl(user)
    const text = `TÔI CẦN GIÚP ĐỠ. Vị trí của tôi: ${link} (sai số khoảng ${Math.round(user.accuracy)} m). Gửi từ ${APP.name}.`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Vị trí khẩn cấp', text })
        return
      } catch {
        // người dùng huỷ hoặc không hỗ trợ: rơi xuống sao chép
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setToast('Đã sao chép vị trí. Dán vào Zalo hoặc SMS để gửi.')
    } catch {
      setToast(link)
    }
  }

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="sos-title">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Đóng" />
      <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-line bg-canvas px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
        <div className="mb-2 flex items-center justify-between">
          <h2 id="sos-title" className="text-xl font-black">
            Khẩn cấp
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full bg-soft"
            aria-label="Đóng"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <p className="mb-3 text-sm text-muted">Chạm số để gọi ngay. Gọi được cả khi không có 4G.</p>

        <HotlineGrid items={HOTLINES} />
        {LOCAL_HOTLINES.length > 0 && (
          <>
            <h3 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-muted">Hotline địa phương</h3>
            <HotlineGrid items={LOCAL_HOTLINES} />
          </>
        )}

        <h3 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-muted">Vị trí của bạn</h3>
        <div className="rounded-2xl border border-line bg-surface p-3">
          {user ? (
            <>
              <p className="font-mono text-sm">
                {user.lat.toFixed(5)}, {user.lng.toFixed(5)}
              </p>
              <p className="text-xs text-muted">Sai số khoảng {Math.round(user.accuracy)} m</p>
            </>
          ) : (
            <p className="text-sm text-muted">
              {geoStatus === 'locating'
                ? 'Đang xác định vị trí…'
                : 'Chưa có vị trí. Bật định vị để gửi toạ độ cho người cứu hộ.'}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={share}
              disabled={!user}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-cta font-bold text-ink disabled:opacity-40"
            >
              <ShareIcon size={18} />
              Gửi vị trí
            </button>
            {user ? (
              <a
                href={pointUrl(user)}
                target="_blank"
                rel="noopener"
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line font-semibold"
              >
                <LocateIcon size={18} />
                Mở bản đồ
              </a>
            ) : (
              <button
                type="button"
                onClick={onLocate}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line font-semibold"
              >
                <LocateIcon size={18} />
                Bật định vị
              </button>
            )}
          </div>
        </div>

        {nearest.length > 0 && (
          <>
            <h3 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-muted">Gần bạn nhất</h3>
            <ul className="space-y-2">
              {nearest.map(p => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                    style={{ background: CATEGORIES[p.category].color, color: '#121212' }}
                  >
                    <CategoryIcon id={p.category} size={20} strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block text-sm text-muted">
                      {CATEGORIES[p.category].label}
                      {p.distance != null && ` · ${formatDistance(p.distance)}`}
                    </span>
                  </span>
                  <a
                    href={telHref(p.phone)}
                    onClick={e => blockSampleCall(e, p.sample)}
                    className="flex h-12 items-center gap-1.5 rounded-xl bg-cta px-3 text-sm font-bold text-ink"
                    aria-label={`Gọi ${p.name}`}
                  >
                    <PhoneIcon size={18} strokeWidth={2.4} />
                    Gọi
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-muted">Xe lủng lốp, làm gì trước?</h3>
        <ul className="list-disc space-y-1 rounded-2xl border border-line bg-surface p-3 pl-7 text-sm">
          <li>Dắt xe vào lề, đứng chỗ sáng có người qua lại.</li>
          <li>Đừng chạy tiếp khi lốp đã xẹp: dễ mất lái và hỏng vành.</li>
          <li>Đi một mình ban đêm thì gửi vị trí cho người thân trước.</li>
          <li>Hỏi giá trước khi thợ làm.</li>
        </ul>
      </div>
      {toast && (
        <div className="fixed inset-x-4 top-[max(16px,env(safe-area-inset-top))] z-50 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
