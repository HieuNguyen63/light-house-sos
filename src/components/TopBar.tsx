import { APP } from '../config'
import { DEMO_TIME } from '../lib/demo'
import { LighthouseMark } from './icons'

interface Props {
  online: boolean
  hasSample: boolean
}

export function TopBar({ online, hasSample }: Props) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-2">
        <div className="pointer-events-auto flex h-12 min-w-0 items-center gap-2.5 rounded-full border border-line bg-surface/95 pl-2 pr-4 shadow-lg">
          <LighthouseMark size={30} />
          <div className="min-w-0 leading-tight">
            <p className="text-[15px] font-bold">{APP.name}</p>
            <p className="truncate text-xs text-muted">
              {APP.tagline}
            </p>
          </div>
        </div>
      </div>
      {!online && (
        <div className="pointer-events-auto self-start rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">
          Không có mạng · dùng dữ liệu đã lưu, vẫn gọi được
        </div>
      )}
      {(DEMO_TIME || hasSample) && (
        <div className="pointer-events-auto self-start rounded-full border border-accent bg-surface/95 px-3 py-1.5 text-xs font-semibold text-accent">
          {DEMO_TIME && `Demo ${DEMO_TIME}`}
          {DEMO_TIME && hasSample && ' · '}
          {hasSample && 'Số liệu mẫu, chưa gọi được'}
        </div>
      )}
    </header>
  )
}
