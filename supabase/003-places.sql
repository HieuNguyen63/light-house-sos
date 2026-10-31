-- Danh sách điểm cứu hộ trên Supabase. Dán toàn bộ vào SQL Editor rồi bấm Run. Chỉ chạy 1 lần, sau 001.
-- Người lạ: chỉ đọc điểm đang hiện. Người duyệt: đọc tất cả, thêm, sửa, ẩn. Không xoá hẳn, chỉ ẩn.

create table public.places (
  id text primary key check (char_length(id) <= 40),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (category in ('sua_xe', 'cap_cuu', 'y_te', 'cong_an', 'tinh_nguyen', 'xang')),
  phone text not null check (char_length(phone) between 1 and 30),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  address text check (char_length(address) <= 200),
  -- Sai định dạng thì tiệm không tự off được, nên chặn ngay từ database
  hours text check (hours ~ '^(24/7|([01]?[0-9]|2[0-4]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9])$'),
  note text check (char_length(note) <= 300),
  verified_at date,
  mobile boolean not null default false,
  vehicles text[],
  prices jsonb,
  rating numeric(2, 1),
  rating_count integer,
  reviews jsonb,
  sample boolean not null default false,
  active boolean not null default true,
  source_feedback_id uuid references public.feedback (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index places_active_idx on public.places (active);

create function public.places_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger places_touch before update on public.places
  for each row execute function public.places_touch();

alter table public.places enable row level security;
revoke all on public.places from anon, authenticated;

grant select (id, name, category, phone, lat, lng, address, hours, note, verified_at, mobile, vehicles, prices, rating, rating_count, reviews, sample, active)
  on public.places to anon;
grant select, insert, update on public.places to authenticated;

create policy "ai cũng đọc được điểm đang hiện" on public.places
  for select to anon, authenticated
  using (active);

create policy "người duyệt đọc tất cả điểm" on public.places
  for select to authenticated
  using (exists (select 1 from public.reviewers r where r.user_id = (select auth.uid())));

create policy "người duyệt thêm điểm" on public.places
  for insert to authenticated
  with check (exists (select 1 from public.reviewers r where r.user_id = (select auth.uid())));

create policy "người duyệt sửa điểm" on public.places
  for update to authenticated
  using (exists (select 1 from public.reviewers r where r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.reviewers r where r.user_id = (select auth.uid())));

-- Duyệt đề xuất: thêm điểm và đổi trạng thái góp ý cùng một lần, lỗi thì không đổi gì
create function public.approve_new_place(p_feedback_id uuid, p_place jsonb) returns text
language plpgsql set search_path = '' as $$
declare
  new_id text := 'dx-' || p_feedback_id::text;
begin
  if not exists (select 1 from public.reviewers r where r.user_id = auth.uid()) then
    raise exception 'Tài khoản này chưa có quyền duyệt' using errcode = '42501';
  end if;
  insert into public.places (id, name, category, phone, lat, lng, address, hours, note, verified_at, mobile, vehicles, prices, source_feedback_id, active)
  values (
    new_id, p_place->>'name', p_place->>'category', p_place->>'phone',
    (p_place->>'lat')::double precision, (p_place->>'lng')::double precision,
    p_place->>'address', p_place->>'hours', p_place->>'note', (p_place->>'verified_at')::date,
    coalesce((p_place->>'mobile')::boolean, false),
    (select array_agg(v) from jsonb_array_elements_text(coalesce(p_place->'vehicles', '[]'::jsonb)) as v),
    p_place->'prices', p_feedback_id, true
  )
  on conflict (id) do update set
    name = excluded.name, category = excluded.category, phone = excluded.phone, lat = excluded.lat, lng = excluded.lng,
    address = excluded.address, hours = excluded.hours, note = excluded.note, verified_at = excluded.verified_at,
    mobile = excluded.mobile, vehicles = excluded.vehicles, prices = excluded.prices, active = true;
  update public.feedback set status = 'approved' where id = p_feedback_id and kind = 'new_place';
  if not found then
    raise exception 'Không tìm thấy đề xuất này';
  end if;
  return new_id;
end $$;
revoke execute on function public.approve_new_place(uuid, jsonb) from public, anon;
grant execute on function public.approve_new_place(uuid, jsonb) to authenticated;

-- Hoàn tác hoặc từ chối một đề xuất đã duyệt thì điểm đó biến khỏi bản đồ
create function public.feedback_hide_place() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind = 'new_place' and new.status <> 'approved' then
    update public.places set active = false where source_feedback_id = new.id;
  end if;
  return new;
end $$;
create trigger feedback_hide_place after update of status on public.feedback
  for each row execute function public.feedback_hide_place();

-- Chuyển danh sách hiện có từ public/data/locations.json lên (đều là dữ liệu mẫu)
insert into public.places (id, name, category, phone, lat, lng, address, hours, note, verified_at, mobile, vehicles, prices, rating, rating_count, reviews, sample)
select id, name, category, phone, lat, lng, address, hours, note, verified_at, coalesce(mobile, false),
  (select array_agg(v) from jsonb_array_elements_text(coalesce(vehicles_json, '[]'::jsonb)) as v),
  prices, rating, rating_count, reviews, coalesce(sample, false)
from jsonb_to_recordset($seed$[
{
"id": "sx-01",
"name": "Sửa xe đêm Anh Bảy",
"category": "sua_xe",
"phone": "0900 000 001",
"lat": 13.7712,
"lng": 109.2198,
"address": "Đường Nguyễn Tất Thành",
"hours": "18:00-02:00",
"note": "Vá xe, thay ruột, câu bình.",
"verified_at": "2026-10-31",
"rating": 4.7,
"rating_count": 23,
"reviews": [
{
"author": "Khách đi đường",
"stars": 5,
"text": "10 giờ đêm vẫn vá cho, giá đúng như tiệm ban ngày.",
"date": "2026-10-20"
},
{
"author": "Anh Tâm",
"stars": 4,
"text": "Chờ hơi lâu vì đông khách, nhưng làm kỹ.",
"date": "2026-10-12"
}
],
"vehicles_json": [
"xe_may"
],
"prices": [
{
"service": "Vá xe",
"price": 30000,
"note": "Sau 22:00 thêm 10.000đ"
},
{
"service": "Thay ruột",
"price": 90000
},
{
"service": "Câu bình",
"price": 50000
}
],
"sample": true
},
{
"id": "sx-02",
"name": "Tiệm xe máy Hùng",
"category": "sua_xe",
"phone": "0900 000 002",
"lat": 13.7801,
"lng": 109.2102,
"address": "Đường Ngô Mây",
"hours": "07:00-22:00",
"rating": 4.2,
"rating_count": 11,
"reviews": [
{
"author": "Chị Hoa",
"stars": 4,
"text": "Tiệm rộng, có chỗ ngồi chờ.",
"date": "2026-09-28"
}
],
"vehicles_json": [
"xe_may"
],
"prices": [
{
"service": "Vá xe",
"price": 25000
},
{
"service": "Thay ruột",
"price": 85000
},
{
"service": "Thay nhớt",
"price": 120000
}
],
"sample": true
},
{
"id": "sx-03",
"name": "Cứu hộ xe lưu động Quy Nhơn",
"category": "sua_xe",
"phone": "0900 000 003",
"lat": 13.765,
"lng": 109.215,
"address": "Khu vực An Dương Vương",
"hours": "24/7",
"note": "Đến tận nơi, kéo xe về tiệm.",
"mobile": true,
"verified_at": "2026-10-28",
"rating": 4.9,
"rating_count": 8,
"reviews": [
{
"author": "Du khách Sài Gòn",
"stars": 5,
"text": "Xe thuê lủng lốp ở Ghềnh Ráng, 20 phút sau thợ tới tận nơi.",
"date": "2026-10-05"
}
],
"vehicles_json": [
"xe_may",
"o_to"
],
"prices": [
{
"service": "Vá xe tại chỗ",
"price": 60000,
"note": "Đã gồm đi lại trong 5 km"
},
{
"service": "Kéo xe máy về tiệm",
"price": 100000
},
{
"service": "Câu bình ô tô",
"price": 150000
}
],
"sample": true
},
{
"id": "sx-04",
"name": "Sửa xe Chú Tư ngã ba",
"category": "sua_xe",
"phone": "0900 000 004",
"lat": 13.786,
"lng": 109.199,
"address": "Đường Tây Sơn",
"hours": "17:00-01:00",
"rating": 3.8,
"rating_count": 5,
"reviews": [
{
"author": "Khách đi đường",
"stars": 3,
"text": "Làm được nhưng nên hỏi giá trước.",
"date": "2026-10-01"
}
],
"vehicles_json": [
"xe_may"
],
"prices": [
{
"service": "Vá xe",
"price": 30000
},
{
"service": "Thay ruột",
"price": 95000
}
],
"sample": true
},
{
"id": "sx-05",
"name": "Sửa xe Cô Lan",
"category": "sua_xe",
"phone": "0900 000 015",
"lat": 13.7735,
"lng": 109.2215,
"address": "Đường Lê Hồng Phong",
"hours": "08:00-18:00",
"rating": 4.5,
"rating_count": 14,
"vehicles_json": [
"xe_may"
],
"prices": [
{
"service": "Vá xe",
"price": 25000
},
{
"service": "Thay lốp",
"price": null
}
],
"sample": true
},
{
"id": "sx-06",
"name": "Vá xe vỉa hè bùng binh",
"category": "sua_xe",
"phone": "0900 000 016",
"lat": 13.7758,
"lng": 109.2185,
"address": "Khu vực Bạch Đằng",
"note": "Chưa hỏi được giờ làm.",
"vehicles_json": [
"xe_may"
],
"prices": [
{
"service": "Vá xe",
"price": null
}
],
"sample": true
},
{
"id": "cc-01",
"name": "Xe cấp cứu 0 đồng nhóm Thiện Tâm",
"category": "cap_cuu",
"phone": "0900 000 005",
"lat": 13.7745,
"lng": 109.207,
"hours": "24/7",
"note": "Miễn phí. Gọi trước 5 phút để xe xuất phát.",
"prices": [
{
"service": "Chở người bệnh",
"price": 0
}
],
"sample": true
},
{
"id": "cc-02",
"name": "Đội cấp cứu tình nguyện Ghềnh Ráng",
"category": "cap_cuu",
"phone": "0900 000 006",
"lat": 13.748,
"lng": 109.211,
"hours": "24/7",
"prices": [
{
"service": "Chở người bệnh",
"price": 0
}
],
"sample": true
},
{
"id": "yt-01",
"name": "Phòng khám 24h",
"category": "y_te",
"phone": "0900 000 007",
"lat": 13.779,
"lng": 109.216,
"address": "Đường Trần Hưng Đạo",
"hours": "24/7",
"prices": [
{
"service": "Khám ngoài giờ",
"price": 150000
}
],
"sample": true
},
{
"id": "yt-02",
"name": "Nhà thuốc trực đêm",
"category": "y_te",
"phone": "0900 000 008",
"lat": 13.769,
"lng": 109.224,
"address": "Đường Lê Duẩn",
"hours": "20:00-06:00",
"prices": [
{
"service": "Thuốc",
"price": null,
"note": "Theo giá niêm yết"
}
],
"sample": true
},
{
"id": "ca-01",
"name": "Điểm trực công an phường",
"category": "cong_an",
"phone": "0900 000 009",
"lat": 13.777,
"lng": 109.223,
"hours": "24/7",
"note": "Điểm an toàn khi cần được bảo vệ hoặc chờ người thân.",
"prices": [
{
"service": "Hỗ trợ an ninh",
"price": 0
}
],
"sample": true
},
{
"id": "ca-02",
"name": "Điểm trực công an phường ven biển",
"category": "cong_an",
"phone": "0900 000 010",
"lat": 13.762,
"lng": 109.216,
"hours": "24/7",
"prices": [
{
"service": "Hỗ trợ an ninh",
"price": 0
}
],
"sample": true
},
{
"id": "tn-01",
"name": "Hiệp sĩ đường phố Quy Nhơn",
"category": "tinh_nguyen",
"phone": "0900 000 011",
"lat": 13.783,
"lng": 109.205,
"hours": "24/7",
"note": "Hỗ trợ đẩy xe, đưa về nơi an toàn.",
"prices": [
{
"service": "Đẩy xe, đưa về nơi an toàn",
"price": 0
}
],
"sample": true
},
{
"id": "tn-02",
"name": "Trạm tình nguyện bến xe",
"category": "tinh_nguyen",
"phone": "0900 000 012",
"lat": 13.7855,
"lng": 109.195,
"hours": "06:00-23:00",
"prices": [
{
"service": "Hỗ trợ người đi đường",
"price": 0
}
],
"sample": true
},
{
"id": "xg-01",
"name": "Trạm xăng 24h cửa ngõ",
"category": "xang",
"phone": "0900 000 013",
"lat": 13.79,
"lng": 109.19,
"hours": "24/7",
"prices": [
{
"service": "Xăng",
"price": null,
"note": "Theo giá niêm yết"
}
],
"sample": true
},
{
"id": "xg-02",
"name": "Trạm xăng 24h ven biển",
"category": "xang",
"phone": "0900 000 014",
"lat": 13.758,
"lng": 109.213,
"hours": "24/7",
"prices": [
{
"service": "Xăng",
"price": null,
"note": "Theo giá niêm yết"
}
],
"sample": true
}
]$seed$::jsonb) as x(
  id text, name text, category text, phone text, lat double precision, lng double precision, address text, hours text, note text,
  verified_at date, mobile boolean, vehicles_json jsonb, prices jsonb, rating numeric, rating_count integer, reviews jsonb, sample boolean
);
