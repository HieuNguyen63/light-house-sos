import type { CategoryId, VehicleId } from './types'

/**
 * Cấu hình chung của app. Dữ liệu điểm cứu hộ nằm trên Supabase, dự phòng ở public/data/locations.json.
 */
export const APP = {
  name: 'Hải Đăng SOS',
  tagline: 'Cứu hộ gần bạn, 24/7',
  /** Khung nhìn khi chưa biết người dùng ở đâu: cả nước. Có vị trí là bay tới vị trí đó. */
  map: {
    center: { lat: 16.2, lng: 106.5 },
    zoom: 6,
  },
  /** Chỉ gợi ý nơi trong bán kính này. Xa hơn thì người gặp nạn không tới được, không nên gọi là "gần bạn". */
  nearbyRadiusM: 30_000,
  dataUrl: '/data/locations.json',
  tiles: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    /** Dùng khi máy chủ chính không tải được (mạng chặn, quá tải). */
    fallbackUrl: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
}

export interface Need {
  /** Cũng là đuôi link để in mã QR riêng, ví dụ /#xe-hong */
  id: string
  label: string
  icon: CategoryId
  categories: CategoryId[]
  /** Không còn nơi nào mở thì gợi ý nhóm này */
  fallback?: CategoryId
  hotline?: { number: string; label: string }
  /** Từ khoá tìm trên Google Maps khi khu vực chưa có dữ liệu */
  mapsQuery: string
}

/** Màn đầu hỏi theo việc người dùng đang gặp, không theo nhóm dữ liệu. */
export const NEEDS: Need[] = [
  { id: 'xe-hong', label: 'Xe hư, lủng lốp', icon: 'sua_xe', categories: ['sua_xe'], fallback: 'tinh_nguyen', mapsQuery: 'tiệm sửa xe' },
  { id: 'cap-cuu', label: 'Tai nạn, cấp cứu', icon: 'cap_cuu', categories: ['cap_cuu', 'y_te'], hotline: { number: '115', label: 'Cấp cứu' }, mapsQuery: 'bệnh viện' },
  { id: 'an-toan', label: 'Cần chỗ an toàn', icon: 'cong_an', categories: ['cong_an', 'tinh_nguyen'], hotline: { number: '113', label: 'Công an' }, mapsQuery: 'công an phường' },
  { id: 'het-xang', label: 'Hết xăng', icon: 'xang', categories: ['xang'], fallback: 'tinh_nguyen', mapsQuery: 'cây xăng' },
]

export const VEHICLE_LABEL: Record<VehicleId, string> = { xe_may: 'Xe máy', o_to: 'Ô tô' }

export interface Hotline {
  number: string
  label: string
  desc: string
  tone: 'red' | 'blue' | 'orange' | 'amber'
}

/** Hotline quốc gia, gọi được không cần mạng. */
export const HOTLINES: Hotline[] = [
  { number: '115', label: 'Cấp cứu', desc: 'Tai nạn, bệnh nặng', tone: 'red' },
  { number: '113', label: 'Công an', desc: 'An ninh, cướp giật', tone: 'blue' },
  { number: '114', label: 'Cứu hỏa, cứu nạn', desc: 'Cháy nổ, mắc kẹt, lũ', tone: 'orange' },
]

/** Hotline địa phương. Thêm khi có số thật, ví dụ đội cấp cứu 0 đồng của thành phố. */
export const LOCAL_HOTLINES: Hotline[] = []

export interface CategoryMeta {
  label: string
  short: string
  color: string
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  sua_xe: { label: 'Sửa xe', short: 'Sửa xe', color: '#F7843F' },
  cap_cuu: { label: 'Cấp cứu 0 đồng', short: 'Cấp cứu', color: '#E5484D' },
  y_te: { label: 'Y tế 24h', short: 'Y tế', color: '#2EC4E8' },
  cong_an: { label: 'Công an', short: 'Công an', color: '#4C8DFF' },
  tinh_nguyen: { label: 'Tình nguyện', short: 'Tình nguyện', color: '#74D97A' },
  xang: { label: 'Xăng 24h', short: 'Xăng', color: '#E356E8' },
}

export const CATEGORY_ORDER: CategoryId[] = ['sua_xe', 'cap_cuu', 'y_te', 'cong_an', 'tinh_nguyen', 'xang']
