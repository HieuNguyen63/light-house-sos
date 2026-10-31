# Hải Đăng SOS

Bản đồ cứu hộ cộng đồng, mã nguồn mở (MIT). Mở trên điện thoại là dùng được ngay: chọn việc đang gặp (xe hư, tai nạn, cần chỗ an toàn, hết xăng), app chỉ ra nơi nên gọi, chạm để gọi. In mã QR riêng từng việc bằng đuôi link `/#xe-hong`, `/#cap-cuu`, `/#an-toan`, `/#het-xang`, `/#sos`. Cài được lên màn hình chính như app (PWA) và vẫn mở được khi mất mạng.

## Chạy thử trên máy

```bash
npm install
npm run dev        # mở http://localhost:5173, thêm --host để test trên điện thoại cùng Wi-Fi
npm run build      # build ra thư mục dist/
npm run preview    # xem bản build tại http://localhost:4173
```

Để thử định vị trên điện thoại, trình duyệt yêu cầu HTTPS hoặc `localhost`. Cách nhanh nhất: chạy `npm run dev`, rồi trên máy tính dùng Chrome DevTools chế độ điện thoại; hoặc deploy lên server có HTTPS (Cloudflare lo phần này).

## Thay dữ liệu cho địa phương của bạn

1. Sửa `src/config.ts`: tên thành phố, toạ độ tâm, hotline địa phương.
2. Có Supabase thì thêm, sửa điểm ở trang `/#duyet`. Không dùng Supabase thì sửa `public/data/locations.json`. Mỗi điểm:

```json
{
  "id": "sx-01",
  "name": "Sửa xe đêm Anh Bảy",
  "category": "sua_xe",
  "phone": "09xx xxx xxx",
  "lat": 13.7712,
  "lng": 109.2198,
  "address": "Đường Nguyễn Tất Thành",
  "hours": "18:00-02:00",
  "note": "Vá xe, thay ruột, câu bình.",
  "mobile": true,
  "verifiedAt": "2026-10-31",
  "rating": 4.6,
  "ratingCount": 23,
  "reviews": [{ "author": "Khách đi đường", "stars": 5, "text": "Vá nhanh, giá đúng.", "date": "2026-10-20" }],
  "prices": [{ "service": "Vá xe", "price": 30000, "note": "Sau 22:00 thêm 10.000đ" }, { "service": "Thay ruột", "price": 90000 }],
  "vehicles": ["xe_may"],
  "sample": false
}
```

- `category`: `sua_xe`, `cap_cuu`, `y_te`, `cong_an`, `tinh_nguyen`, `xang`.
- `hours`: `"24/7"` hoặc `"HH:MM-HH:MM"`, qua đêm được (`"18:00-02:00"`).
- Quá giờ trong `hours` thì điểm tự off: biến khỏi bản đồ, chuyển xuống mục "đã nghỉ", không còn nút gọi. Không có `hours` thì vẫn hiện, ghi "Chưa rõ giờ".
- `mobile`: thợ đến tận nơi. `verifiedAt`: ngày gọi xác minh gần nhất. `rating`, `ratingCount`, `reviews`: đánh giá của cộng đồng (lấy từ file này).
- `prices`: đơn giá theo dịch vụ. `price: 0` hiện "Miễn phí", `price: null` hiện `note` hoặc "Hỏi giá". `vehicles`: `xe_may`, `o_to`.
- `sample: true` hiện nhãn "mẫu", cảnh báo trên đầu app và chặn nút gọi. Bỏ trường này khi dữ liệu đã xác minh.

## Xem demo

Thêm `?demo=22:30` vào link để giả lập giờ đó và đứng ở trung tâm thành phố, không cần định vị. Ví dụ `http://localhost:5173/?demo=02:30` để xem cảnh hầu hết tiệm đã off.

Dữ liệu đi kèm repo hiện là **dữ liệu mẫu**, số điện thoại không có thật.

## Góp ý cộng đồng

Nút "Góp ý" trên đầu app (góp ý chung, đề xuất điểm mới) và nút "Đánh giá hoặc báo sai" trong thẻ từng điểm. Đề xuất điểm mới có 4 cách chọn vị trí: nhập địa chỉ (app tự tạo link Google Maps và tìm toạ độ qua Nominatim của OpenStreetMap khi bấm Tìm), dán link Google Maps, dùng GPS, kéo bản đồ để ghim. Link rút gọn `maps.app.goo.gl` chưa tự đọc được toạ độ, người duyệt mở link để kiểm tra.

Góp ý lưu trên máy trước, rồi gửi lên Supabase; mất mạng thì tự gửi lại sau. Chỉ đánh giá đã duyệt mới hiện công khai.

Cài cho địa phương của bạn:

1. Tạo dự án Supabase, chạy lần lượt `supabase/001-feedback.sql`, `003-places.sql`, `004-security.sql` trong SQL Editor.
2. Chép `.env.example` thành `.env.local`, điền Project URL và Publishable key. Không dùng Secret key.
3. Tạo tài khoản người duyệt ở Authentication › Users, sửa email trong `supabase/002-add-reviewer.sql` rồi chạy. Nên tắt cho đăng ký tự do.
4. Mở `/#duyet` để duyệt góp ý và quản lý danh sách điểm. Danh sách lấy từ Supabase, lưu lại trên máy người dùng; máy chủ lỗi mà máy chưa có dữ liệu thì dùng `public/data/locations.json`.

Không điền `.env.local` thì góp ý chỉ lưu trên máy người dùng.

## Deploy lên VPS Ubuntu (Docker)

Server cần có Docker và plugin `docker compose` (VPS TinoHost đang chạy n8n đã có sẵn).

```bash
./deploy.sh                       # mặc định root@163.61.73.171, thư mục /opt/hai-dang-sos
SERVER=ubuntu@1.2.3.4 ./deploy.sh # server khác
```

Script rsync mã nguồn lên server rồi chạy `docker compose up -d --build`. Container lắng nghe cổng `8090`. Sau đó:

1. Trên Cloudflare, tạo bản ghi A cho subdomain (ví dụ `sos.tenmien.vn`) trỏ về IP server, bật proxy (đám mây cam) để có HTTPS.
2. Nếu server đã có reverse proxy (nginx, Caddy, Traefik cho n8n), thêm một route từ subdomain tới `localhost:8090`. Nếu chưa, đổi `8090:80` trong `docker-compose.yml` thành `80:80`.
3. Định vị GPS và cài PWA chỉ hoạt động qua HTTPS.

Header bảo mật nằm ở `public/_headers` (Cloudflare Pages) và `security-headers.inc` (nginx), sửa thì sửa cả hai. Thêm miền mới cho bản đồ hoặc máy chủ thì phải thêm vào CSP.

Cập nhật dữ liệu sau khi deploy: sửa `public/data/locations.json` rồi chạy lại `./deploy.sh`.

## Mã QR

In mã QR trỏ tới địa chỉ app, dán tại khách sạn, trạm xăng, bến xe. Tạo nhanh bằng bất kỳ công cụ QR nào với link `https://sos.tenmien.vn`.

## Cấu trúc

```
src/
  config.ts          cấu hình địa phương, hotline, màu nhóm
  App.tsx            ghép màn hình: bản đồ, panel danh sách, SOS
  components/        MapView, NearbyPanel, PlaceCard, SosSheet, FeedbackSheet, TopBar, CategoryChips, icons
  lib/               Supabase, góp ý, tính khoảng cách, giờ mở cửa, hook định vị, tải dữ liệu, online/offline
public/data/         locations.json
supabase/            SQL tạo bảng góp ý và cấp quyền duyệt
public/icons/        icon PWA (sinh bằng scripts/make-icons.py)
```

Stack: Vite, React, TypeScript, Tailwind CSS v4, Leaflet, vite-plugin-pwa. Bản đồ nền OpenStreetMap. Giao diện sáng để đọc được dưới nắng, font Be Vietnam Pro.
