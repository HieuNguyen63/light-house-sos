import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchApproved, hasBackend, sendFeedback, type ApprovedFeedback } from './supabase'
import type { FeedbackEntry } from '../types'

const STORAGE_KEY = 'hds:feedback'

export type SubmitResult = 'sent' | 'queued' | 'local'

/** Góp ý luôn lưu trên máy trước. Gửi không được (mất mạng) thì giữ lại, có mạng hoặc mở lại app sẽ gửi tiếp. */
export function useFeedback() {
  const [entries, setEntries] = useState<FeedbackEntry[]>(read)
  const flushing = useRef(false)

  const update = useCallback((change: (list: FeedbackEntry[]) => FeedbackEntry[]) => {
    setEntries(list => {
      const next = change(list)
      write(next)
      return next
    })
  }, [])

  const flush = useCallback(async () => {
    if (!hasBackend || flushing.current) return
    flushing.current = true
    for (const entry of read().filter(e => !e.synced)) {
      try {
        await sendFeedback(entry)
        update(list => list.map(e => (e.id === entry.id ? { ...e, synced: true } : e)))
      } catch {
        break
      }
    }
    flushing.current = false
  }, [update])

  useEffect(() => {
    void flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [flush])

  const submit = useCallback(
    async (entry: Omit<FeedbackEntry, 'id' | 'createdAt' | 'synced'>): Promise<SubmitResult> => {
      const full: FeedbackEntry = { ...entry, id: String(Date.now()), createdAt: new Date().toISOString().slice(0, 10) }
      update(list => [full, ...list])
      if (!hasBackend) return 'local'
      try {
        await sendFeedback(full)
        update(list => list.map(e => (e.id === full.id ? { ...e, synced: true } : e)))
        return 'sent'
      } catch {
        return 'queued'
      }
    },
    [update],
  )

  return { entries, submit }
}

/** Đánh giá đã duyệt để hiện công khai. Lỗi thì bỏ qua: không được làm hỏng việc tìm tiệm. */
export function useApprovedFeedback(): ApprovedFeedback[] {
  const [items, setItems] = useState<ApprovedFeedback[]>([])
  useEffect(() => {
    if (!hasBackend) return
    fetchApproved().then(setItems).catch(() => {})
  }, [])
  return items
}

function read(): FeedbackEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FeedbackEntry[]) : []
  } catch {
    return []
  }
}

function write(entries: FeedbackEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // bộ nhớ đầy hoặc bị chặn: bỏ qua
  }
}
