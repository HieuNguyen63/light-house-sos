export type CategoryId = 'sua_xe' | 'cap_cuu' | 'y_te' | 'cong_an' | 'tinh_nguyen' | 'xang'

export type VehicleId = 'xe_may' | 'o_to'

export interface PriceItem {
  service: string
  /** Đơn giá VND. 0 = miễn phí, null = chưa có giá (hiện note hoặc "Hỏi giá") */
  price: number | null
  /** Ví dụ "sau 22:00 thêm 10.000đ" */
  note?: string
}

export interface FeedbackEntry {
  id: string
  /** YYYY-MM-DD */
  createdAt: string
  kind: 'place' | 'app' | 'new_place'
  placeId?: string
  placeName?: string
  stars?: number
  issues?: string[]
  text?: string
  author?: string
  newPlace?: { name: string; phone: string; hours: string; price: string; address: string; mapLink?: string; source?: string }
  position?: LatLng
  /** Đã gửi lên máy chủ. Chưa gửi được thì giữ trên máy để gửi lại */
  synced?: boolean
}

export interface Review {
  author: string
  stars: number
  text: string
  /** YYYY-MM-DD */
  date: string
}

export interface Place {
  id: string
  name: string
  category: CategoryId
  phone: string
  lat: number
  lng: number
  address?: string
  /** "24/7" hoặc "HH:MM-HH:MM" (qua đêm được, ví dụ "18:00-02:00") */
  hours?: string
  note?: string
  verified?: boolean
  /** Ngày gọi xác minh gần nhất, YYYY-MM-DD */
  verifiedAt?: string
  /** true = thợ đến tận nơi */
  mobile?: boolean
  /** Điểm trung bình thang 5 của cộng đồng */
  rating?: number
  ratingCount?: number
  reviews?: Review[]
  prices?: PriceItem[]
  /** Loại xe nhận sửa. Không ghi = không áp dụng hoặc chưa rõ */
  vehicles?: VehicleId[]
  /** true = dữ liệu mẫu để thử nghiệm, không phải số thật */
  sample?: boolean
}

export interface LatLng {
  lat: number
  lng: number
}

export interface UserPosition extends LatLng {
  accuracy: number
}

export interface NearbyPlace extends Place {
  distance: number | null
  status: HoursStatus
  /** Số phút tới giờ nghỉ, null nếu mở 24/7, đã nghỉ hoặc chưa rõ giờ */
  closingIn: number | null
}

export type HoursStatus = 'always' | 'open' | 'closed' | 'unknown'

export interface FlyTo {
  target: LatLng
  zoom?: number
  /** Khung bản đồ phải thấy cả điểm này, thường là vị trí người dùng */
  include?: LatLng
  /** Đặt thẳng, không có hiệu ứng bay */
  instant?: boolean
  /** tăng key để kích hoạt bay tới, kể cả cùng toạ độ */
  key: number
}
