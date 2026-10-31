import { useCallback, useEffect, useRef, useState } from 'react'
import type { UserPosition } from '../types'

export type GeoStatus = 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable'

export function useGeolocation(auto = true) {
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [position, setPosition] = useState<UserPosition | null>(null)
  const watchId = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }
    stop()
    setStatus(s => (s === 'ok' ? s : 'locating'))
    // Lấy nhanh vị trí sơ bộ để bản đồ tới đúng chỗ ngay, GPS chính xác cập nhật ngay sau đó
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition(p => p ?? { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setStatus('ok')
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 5_000 },
    )
    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setStatus('ok')
      },
      err => {
        // Đã có vị trí mà GPS chập chờn thì giữ vị trí đó, không báo mất định vị
        setStatus(s => (err.code === err.PERMISSION_DENIED ? 'denied' : s === 'ok' ? s : 'unavailable'))
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    )
  }, [stop])

  useEffect(() => {
    if (auto) start()
    return stop
  }, [auto, start, stop])

  return { status, position, locate: start }
}
