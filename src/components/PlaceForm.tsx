import { useState, type FormEvent } from 'react'
import { CATEGORIES, CATEGORY_ORDER, VEHICLE_LABEL } from '../config'
import { CloseIcon } from './icons'
import { LocationPicker, type PickedLocation } from './LocationPicker'
import type { CategoryId, Place, PriceItem, VehicleId } from '../types'

const INPUT = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink'
const HOURS_PATTERN = /^(24\/7|([01]?\d|2[0-4]):[0-5]\d-([01]?\d|2[0-4]):[0-5]\d)$/

interface PriceDraft {
  service: string
  price: string
  note: string
}

interface Props {
  title: string
  submitLabel: string
  initial: Partial<Place>
  onSubmit: (place: Place) => Promise<void>
  onClose: () => void
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Form dùng chung: thêm điểm, sửa điểm, kiểm tra đề xuất trước khi đưa lên bản đồ. */
export function PlaceForm({ title, submitLabel, initial, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initial.name ?? '')
  const [category, setCategory] = useState<CategoryId>(initial.category ?? 'sua_xe')
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [hours, setHours] = useState(initial.hours ?? '')
  const [address, setAddress] = useState(initial.address ?? '')
  const [note, setNote] = useState(initial.note ?? '')
  const [mobile, setMobile] = useState(Boolean(initial.mobile))
  const [vehicles, setVehicles] = useState<VehicleId[]>(initial.vehicles ?? [])
  const [prices, setPrices] = useState<PriceDraft[]>(
    (initial.prices ?? []).map(p => ({ service: p.service, price: p.price == null ? '' : String(p.price), note: p.note ?? '' })),
  )
  const [location, setLocation] = useState<PickedLocation | null>(
    initial.lat != null && initial.lng != null ? { lat: initial.lat, lng: initial.lng, source: 'pin' } : null,
  )
  const [verifiedNow, setVerifiedNow] = useState(false)
  const [sample, setSample] = useState(Boolean(initial.sample))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleVehicle = (v: VehicleId) => setVehicles(list => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]))
  const setPrice = (i: number, change: Partial<PriceDraft>) => setPrices(list => list.map((p, j) => (j === i ? { ...p, ...change } : p)))

  const validate = (): string | null => {
    if (!name.trim()) return 'Chưa nhập tên.'
    if (hours.trim() && !HOURS_PATTERN.test(hours.trim())) return 'Giờ làm phải ghi dạng 18:00-02:00 hoặc 24/7. Sai dạng thì tiệm không tự off được.'
    if (!location) return 'Chưa chọn vị trí trên bản đồ.'
    if (prices.some(p => p.price.trim() && !/^\d+$/.test(p.price.trim()))) return 'Đơn giá chỉ ghi số, ví dụ 30000. Miễn phí ghi 0, chưa rõ giá thì để trống.'
    if (prices.some(p => !p.service.trim())) return 'Dòng đơn giá còn thiếu tên dịch vụ.'
    return null
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError(null)
    const cleanPrices: PriceItem[] = prices.map(p => ({
      service: p.service.trim(),
      price: p.price.trim() === '' ? null : Number(p.price),
      ...(p.note.trim() ? { note: p.note.trim() } : {}),
    }))
    try {
      await onSubmit({
        id: initial.id ?? `d-${Date.now().toString(36)}`,
        name: name.trim(),
        category,
        phone: phone.trim() || undefined,
        lat: location!.lat,
        lng: location!.lng,
        address: address.trim() || undefined,
        hours: hours.trim() || undefined,
        note: note.trim() || undefined,
        verifiedAt: verifiedNow ? today() : initial.verifiedAt,
        mobile: mobile || undefined,
        vehicles: category === 'sua_xe' && vehicles.length ? vehicles : undefined,
        prices: cleanPrices,
        sample: sample || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được, thử lại.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-canvas" role="dialog" aria-modal="true" aria-labelledby="place-form-title">
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-10">
        <div className="flex items-center justify-between gap-3">
          <h2 id="place-form-title" className="min-w-0 text-xl font-black">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soft" aria-label="Đóng">
            <CloseIcon size={20} />
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Tên</span>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={120} autoComplete="off" className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Nhóm</span>
          <select value={category} onChange={e => setCategory(e.target.value as CategoryId)} className={INPUT}>
            {CATEGORY_ORDER.map(id => (
              <option key={id} value={id}>
                {CATEGORIES[id].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Số điện thoại, chưa có thì để trống</span>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} autoComplete="off" className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Giờ làm, ví dụ 18:00-02:00 hoặc 24/7</span>
          <input value={hours} onChange={e => setHours(e.target.value)} autoComplete="off" className={INPUT} />
          <span className="mt-1 block text-sm text-muted">Quá giờ này điểm sẽ tự off. Để trống thì ghi "Chưa rõ giờ".</span>
        </label>

        <LocationPicker value={location} onChange={setLocation} user={null} address={address} onAddress={setAddress} inputClass={INPUT} />

        <fieldset className="space-y-2">
          <legend className="text-base font-bold">Đơn giá</legend>
          {prices.map((p, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-line bg-surface p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                <input aria-label={`Dịch vụ dòng ${i + 1}`} placeholder="Dịch vụ" value={p.service} onChange={e => setPrice(i, { service: e.target.value })} className={INPUT} />
                <input aria-label={`Giá dòng ${i + 1}`} placeholder="Giá" inputMode="numeric" value={p.price} onChange={e => setPrice(i, { price: e.target.value })} className={INPUT} />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input aria-label={`Ghi chú giá dòng ${i + 1}`} placeholder="Ghi chú, ví dụ phụ thu đêm" value={p.note} onChange={e => setPrice(i, { note: e.target.value })} className={INPUT} />
                <button type="button" onClick={() => setPrices(list => list.filter((_, j) => j !== i))} className="h-12 shrink-0 rounded-xl border border-line px-3 text-sm font-semibold active:bg-soft" aria-label={`Xoá dòng giá ${i + 1}`}>
                  Xoá
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setPrices(list => [...list, { service: '', price: '', note: '' }])} className="h-11 w-full rounded-xl border border-line bg-surface text-sm font-semibold active:bg-soft">
            Thêm dòng giá
          </button>
          <p className="text-sm text-muted">Giá ghi số, ví dụ 30000. Miễn phí ghi 0. Chưa rõ giá thì để trống.</p>
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Ghi chú</span>
          <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} rows={2} className={INPUT} />
        </label>

        <div className="space-y-1 text-sm">
          <Check label="Thợ đến tận nơi" checked={mobile} onChange={setMobile} />
          {category === 'sua_xe' &&
            (Object.keys(VEHICLE_LABEL) as VehicleId[]).map(v => (
              <Check key={v} label={`Nhận sửa ${VEHICLE_LABEL[v].toLowerCase()}`} checked={vehicles.includes(v)} onChange={() => toggleVehicle(v)} />
            ))}
          <Check label="Đã gọi xác minh hôm nay" checked={verifiedNow} onChange={setVerifiedNow} />
          {initial.sample && <Check label="Vẫn là dữ liệu mẫu (bỏ chọn khi đã có số thật)" checked={sample} onChange={setSample} />}
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-sos-500/40 bg-sos-500/10 p-3 text-sm">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving} className="h-14 w-full rounded-2xl bg-cta text-base font-black text-ink active:bg-cta-hover disabled:opacity-40">
          {saving ? 'Đang lưu…' : submitLabel}
        </button>
      </form>
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-[#B34A14]" />
      {label}
    </label>
  )
}
