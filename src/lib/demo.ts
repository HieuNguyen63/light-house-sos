import { useEffect, useState } from 'react'
import type { UserPosition } from '../types'

/**
 * Chế độ demo: thêm ?demo=22:30 vào link để giả lập giờ đó và đứng ở trung tâm Quy Nhơn, nơi có dữ liệu mẫu.
 * Dùng để trình diễn tiệm tự off theo giờ, ở bất kỳ đâu, không cần định vị.
 */
const match = new URLSearchParams(window.location.search).get('demo')?.match(/^(\d{1,2}):(\d{2})$/)

export const DEMO_TIME: string | null = match ? match[0] : null

export const DEMO_POSITION: UserPosition = { lat: 13.7765, lng: 109.2237, accuracy: 20 }

function demoNow(): Date {
  const d = new Date()
  d.setHours(Number(match![1]), Number(match![2]), 0, 0)
  return d
}

/** Giờ hiện tại, tự cập nhật để tiệm vừa qua giờ đăng ký off ngay khi app đang mở. */
export function useNow(): Date {
  const [now, setNow] = useState(() => (match ? demoNow() : new Date()))
  useEffect(() => {
    if (match) return
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now
}
