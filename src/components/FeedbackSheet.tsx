import { useEffect, useState, type FormEvent } from 'react'
import type { SubmitResult } from '../lib/useFeedback'
import { CloseIcon } from './icons'
import { LocationPicker, type PickedLocation } from './LocationPicker'
import type { FeedbackEntry, Place, UserPosition } from '../types'

export type FeedbackTarget = { place: Place } | { place: null }

interface Props {
  target: FeedbackTarget | null
  onClose: () => void
  onSubmit: (entry: Omit<FeedbackEntry, 'id' | 'createdAt' | 'synced'>) => Promise<SubmitResult>
  entries: FeedbackEntry[]
  user: UserPosition | null
}

type GeneralKind = 'app' | 'new_place'

const ISSUES = ['Đã đóng cửa', 'Sai giờ', 'Sai số điện thoại', 'Sai đơn giá', 'Sai vị trí', 'Hét giá']
const MAX_TEXT = 500
const RESULT_TEXT: Record<SubmitResult, string> = {
  sent: 'Góp ý đã được gửi và đang chờ duyệt.',
  queued: 'Chưa gửi được lúc này. App sẽ tự gửi lại khi mạng ổn định.',
  local: 'Bản demo mới lưu trên máy này, chưa gửi tới người duyệt.',
}

/** Trạng thái một góp ý của chính người dùng, hiện dưới nội dung. */
export function feedbackStateText(entry: FeedbackEntry): string {
  return entry.synced ? 'Đã gửi, chờ duyệt' : 'Chưa gửi, chỉ đang lưu trên máy này'
}

const INPUT = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink'

export function FeedbackSheet({ target, onClose, onSubmit, entries, user }: Props) {
  const [kind, setKind] = useState<GeneralKind>('app')
  const [stars, setStars] = useState(0)
  const [issues, setIssues] = useState<string[]>([])
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [newPlace, setNewPlace] = useState({ name: '', phone: '', hours: '', price: '', address: '', mapLink: '' })
  const [location, setLocation] = useState<PickedLocation | null>(null)
  const [done, setDone] = useState<SubmitResult | null>(null)
  const [sending, setSending] = useState(false)

  const open = target != null
  useEffect(() => {
    if (!open) return
    setStars(0)
    setIssues([])
    setText('')
    setAuthor('')
    setNewPlace({ name: '', phone: '', hours: '', price: '', address: '', mapLink: '' })
    setLocation(null)
    setDone(null)
    setSending(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, target, onClose])

  if (!target) return null
  const place = target.place
  const isNewPlace = !place && kind === 'new_place'
  const canSend = place ? stars > 0 || issues.length > 0 || text.trim() !== '' : isNewPlace ? newPlace.name.trim() !== '' : text.trim() !== ''

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSend || sending) return
    setSending(true)
    const result = await onSubmit({
      kind: place ? 'place' : kind,
      placeId: place?.id,
      placeName: place?.name ?? (isNewPlace ? newPlace.name.trim() : undefined),
      stars: place && stars ? stars : undefined,
      issues: place && issues.length ? issues : undefined,
      text: text.trim() || undefined,
      author: author.trim() || undefined,
      newPlace: isNewPlace ? { ...newPlace, source: location?.source } : undefined,
      position: isNewPlace && location ? { lat: location.lat, lng: location.lng } : undefined,
    })
    setSending(false)
    setDone(result)
  }

  const toggleIssue = (issue: string) =>
    setIssues(list => (list.includes(issue) ? list.filter(i => i !== issue) : [...list, issue]))

  const generalEntries = entries.filter(e => e.kind !== 'place')

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Đóng" />
      <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-line bg-canvas px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="feedback-title" className="min-w-0 text-xl font-black">
            {place ? `Góp ý về ${place.name}` : 'Góp ý cộng đồng'}
          </h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soft" aria-label="Đóng">
            <CloseIcon size={20} />
          </button>
        </div>

        {done ? (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-bold text-ok">Cảm ơn bạn đã góp ý.</p>
            <p className="mt-1 text-sm text-muted">{RESULT_TEXT[done]}</p>
            <button type="button" onClick={onClose} className="mt-3 h-12 w-full rounded-xl bg-cta font-bold text-ink active:bg-cta-hover">
              Xong
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4">
            {!place && (
              <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Loại góp ý">
                {(
                  [
                    ['app', 'Góp ý cho app'],
                    ['new_place', 'Đề xuất điểm mới'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={kind === id}
                    onClick={() => setKind(id)}
                    className={`h-11 rounded-full border text-sm font-semibold ${kind === id ? 'border-cta bg-cta text-ink' : 'border-line bg-surface text-ink'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {place && (
              <>
                <fieldset>
                  <legend className="mb-1 text-sm font-semibold">Chấm điểm</legend>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setStars(n === stars ? 0 : n)}
                        aria-label={`${n} sao`}
                        aria-pressed={n <= stars}
                        className={`h-11 w-11 text-3xl leading-none ${n <= stars ? 'text-accent' : 'text-line'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">Báo thông tin sai</legend>
                  <div className="flex flex-wrap gap-2">
                    {ISSUES.map(issue => {
                      const on = issues.includes(issue)
                      return (
                        <button
                          key={issue}
                          type="button"
                          onClick={() => toggleIssue(issue)}
                          aria-pressed={on}
                          className={`h-11 rounded-full border px-3 text-sm font-medium ${on ? 'border-cta bg-cta text-ink' : 'border-line bg-surface text-ink'}`}
                        >
                          {issue}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              </>
            )}

            {isNewPlace && (
              <div className="space-y-3">
                <Field label="Tên tiệm hoặc đội (bắt buộc)" value={newPlace.name} onChange={name => setNewPlace(v => ({ ...v, name }))} />
                <Field label="Số điện thoại" type="tel" value={newPlace.phone} onChange={phone => setNewPlace(v => ({ ...v, phone }))} />
                <Field label="Giờ làm, ví dụ 18:00-02:00" value={newPlace.hours} onChange={hours => setNewPlace(v => ({ ...v, hours }))} />
                <Field label="Đơn giá, ví dụ vá xe 30.000đ" value={newPlace.price} onChange={price => setNewPlace(v => ({ ...v, price }))} />
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  user={user}
                  address={newPlace.address}
                  onAddress={address => setNewPlace(v => ({ ...v, address }))}
                  onMapLink={mapLink => setNewPlace(v => ({ ...v, mapLink }))}
                  inputClass={INPUT}
                />
                <p className="text-sm text-muted">Nhớ hỏi chủ tiệm trước khi đưa số điện thoại lên app.</p>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-semibold">{isNewPlace ? 'Ghi chú thêm' : 'Nội dung góp ý'}</span>
              <textarea value={text} onChange={e => setText(e.target.value)} maxLength={MAX_TEXT} rows={3} className={INPUT} />
            </label>
            {!isNewPlace && <Field label="Tên hiển thị (không bắt buộc)" value={author} onChange={setAuthor} />}

            <p className="text-sm text-muted">Góp ý được duyệt trước khi hiện công khai. Đừng ghi số CCCD hay thông tin riêng tư của người khác.</p>
            <button
              type="submit"
              disabled={!canSend || sending}
              className="h-14 w-full rounded-2xl bg-cta text-base font-black text-ink active:bg-cta-hover disabled:opacity-40"
            >
              {sending ? 'Đang gửi…' : 'Gửi góp ý'}
            </button>
          </form>
        )}

        {!place && generalEntries.length > 0 && (
          <>
            <h3 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-muted">Bạn đã góp ý</h3>
            <ul className="space-y-2">
              {generalEntries.map(e => (
                <li key={e.id} className="rounded-2xl border border-line bg-surface p-3 text-sm">
                  <p className="font-semibold">{e.kind === 'new_place' ? `Điểm mới: ${e.placeName}` : 'Góp ý cho app'}</p>
                  {e.text && <p className="mt-0.5 text-muted">{e.text}</p>}
                  <p className="mt-0.5 text-xs text-muted">{feedbackStateText(e)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} autoComplete="off" className={INPUT} />
    </label>
  )
}
