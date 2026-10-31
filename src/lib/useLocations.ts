import { useCallback, useEffect, useState } from 'react'
import { APP } from '../config'
import { fetchPlaces, hasBackend } from './supabase'
import type { Place } from '../types'

const CACHE_KEY = 'hds:locations'

interface State {
  places: Place[]
  loading: boolean
  error: string | null
}

export function useLocations() {
  const [state, setState] = useState<State>({ places: readCache(), loading: true, error: null })

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const places = (await loadPlaces()).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      writeCache(places)
      setState({ places, loading: false, error: null })
    } catch {
      setState(s => ({
        places: s.places,
        loading: false,
        error: s.places.length ? null : 'Không tải được dữ liệu. Kiểm tra mạng rồi thử lại.',
      }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, reload: load }
}

/**
 * Lấy từ Supabase. Máy chủ lỗi hoặc đang tạm dừng thì dùng dữ liệu đã lưu trên máy (đang có trong state),
 * máy chưa có gì mới dùng file đi kèm app: app cứu hộ không được trắng vì máy chủ.
 */
async function loadPlaces(): Promise<Place[]> {
  if (hasBackend) {
    try {
      return await fetchPlaces()
    } catch (e) {
      if (readCache().length) throw e
    }
  }
  const res = await fetch(APP.dataUrl, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return ((await res.json()) as { places: Place[] }).places
}

function readCache(): Place[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Place[]) : []
  } catch {
    return []
  }
}

function writeCache(places: Place[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(places))
  } catch {
    // bộ nhớ đầy hoặc bị chặn: bỏ qua
  }
}
