import type { ReactNode } from 'react'
import { CATEGORIES } from '../config'
import type { CategoryId } from '../types'

export const CATEGORY_PATHS: Record<CategoryId, string> = {
  sua_xe:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  cap_cuu: 'M12 6v12M6 12h12',
  y_te: 'M22 12h-4l-3 9L9 3l-3 9H2',
  cong_an: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  tinh_nguyen:
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  xang: 'M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 22h12M6 10h6M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3',
}

interface SvgProps {
  size?: number
  className?: string
  strokeWidth?: number
}

function Svg({ size = 20, className, strokeWidth = 2, children }: SvgProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const CategoryIcon = ({ id, ...p }: SvgProps & { id: CategoryId }) => (
  <Svg {...p}>
    <path d={CATEGORY_PATHS[id]} />
  </Svg>
)
export const PhoneIcon = (p: SvgProps) => (
  <Svg {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
)
export const RouteIcon = (p: SvgProps) => (
  <Svg {...p}>
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </Svg>
)
export const LocateIcon = (p: SvgProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Svg>
)
export const ShareIcon = (p: SvgProps) => (
  <Svg {...p}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
  </Svg>
)
export const ChatIcon = (p: SvgProps) => (
  <Svg {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>
)
export const CloseIcon = (p: SvgProps) => (
  <Svg {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Svg>
)
export const ChevronIcon = ({ up, ...p }: SvgProps & { up?: boolean }) => (
  <Svg {...p}>
    <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
  </Svg>
)

export const LighthouseMark = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="#F7843F" />
    <path d="M13 10h6l1.5 14h-9z" fill="#121212" />
    <rect x="12" y="7" width="8" height="3" rx="1" fill="#121212" />
    <path d="M5 9l6 3M27 9l-6 3" stroke="#121212" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

/** HTML cho marker Leaflet (divIcon). */
export function markerHtml(id: CategoryId, selected: boolean): string {
  const color = CATEGORIES[id].color
  const size = selected ? 44 : 34
  return `<div class="hds-marker${selected ? ' is-selected' : ''}" style="--c:${color};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" fill="none" stroke="#121212" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${CATEGORY_PATHS[id]}"/></svg></div>`
}
