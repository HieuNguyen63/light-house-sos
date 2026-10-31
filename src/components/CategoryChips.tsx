import { CATEGORIES, CATEGORY_ORDER } from '../config'
import type { CategoryId } from '../types'

export type Filter = CategoryId | 'all'

interface Props {
  value: Filter
  onChange: (v: Filter) => void
  counts: Record<string, number>
}

export function CategoryChips({ value, onChange, counts }: Props) {
  const items: { id: Filter; label: string; color?: string }[] = [
    { id: 'all', label: 'Tất cả' },
    ...CATEGORY_ORDER.map(id => ({ id, label: CATEGORIES[id].short, color: CATEGORIES[id].color })),
  ]
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-1" role="tablist" aria-label="Loại điểm cứu hộ">
      {items.map(it => {
        const active = it.id === value
        const n = counts[it.id] ?? 0
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
              active
                ? 'border-cta bg-cta text-ink'
                : 'border-line bg-soft text-ink active:bg-soft'
            }`}
          >
            {it.color && (
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: active ? '#121212' : it.color }} />
            )}
            {it.label}
            <span className={`text-xs ${active ? 'text-ink/70' : 'text-muted'}`}>{n}</span>
          </button>
        )
      })}
    </div>
  )
}
