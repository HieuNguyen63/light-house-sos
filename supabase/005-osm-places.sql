-- Cho phép điểm chưa có số điện thoại, ghi nguồn dữ liệu, nhập điểm thật ở Quy Nhơn từ OpenStreetMap.
-- Dán toàn bộ vào SQL Editor rồi bấm Run. Chỉ chạy 1 lần, sau 004.
-- Dữ liệu vị trí, tên: © OpenStreetMap contributors, giấy phép ODbL (https://www.openstreetmap.org/copyright).
-- Điểm mẫu bị ẩn, không xoá: bật lại được ở tab Danh sách điểm.

alter table public.places alter column phone drop not null;
alter table public.places add column source text check (char_length(source) <= 40);
alter table public.places add column source_url text check (char_length(source_url) <= 300);
grant select (source, source_url) on public.places to anon;

update public.places set active = false where sample;

insert into public.places (id, name, category, phone, lat, lng, address, note, source, source_url)
select id, name, category, phone, lat, lng, address, note, source, source_url
from jsonb_to_recordset($seed$[
{
"id": "osm-r15794335",
"name": "Bệnh viện Đa khoa trung tâm tỉnh Gia Lai",
"category": "y_te",
"phone": "0256 3822184",
"lat": 13.76733,
"lng": 109.225256,
"note": "Số điện thoại theo website bệnh viện. Trước đây là Bệnh viện Đa khoa tỉnh Bình Định.",
"source": "osm",
"source_url": "https://gialaicentralhospital.com.vn"
},
{
"id": "osm-w966205254",
"name": "Bệnh viện Quân y 13",
"category": "y_te",
"lat": 13.750521,
"lng": 109.213859,
"source": "osm",
"source_url": "https://www.openstreetmap.org/way/966205254"
},
{
"id": "osm-w1236021585",
"name": "Trung tâm Y tế Quy Nhơn",
"category": "y_te",
"lat": 13.774743,
"lng": 109.237469,
"address": "114 Trần Hưng Đạo",
"source": "osm",
"source_url": "https://www.openstreetmap.org/way/1236021585"
},
{
"id": "osm-w313408756",
"name": "Trung tâm Y tế Tuy Phước",
"category": "y_te",
"lat": 13.82031,
"lng": 109.151136,
"source": "osm",
"source_url": "https://www.openstreetmap.org/way/313408756"
},
{
"id": "osm-w314065247",
"name": "Trạm y tế Diêu Trì",
"category": "y_te",
"lat": 13.809474,
"lng": 109.147666,
"source": "osm",
"source_url": "https://www.openstreetmap.org/way/314065247"
},
{
"id": "osm-w1167733586",
"name": "Công an tỉnh (trụ sở tại Quy Nhơn)",
"category": "cong_an",
"lat": 13.769289,
"lng": 109.226072,
"note": "Khẩn cấp gọi 113.",
"source": "osm",
"source_url": "https://www.openstreetmap.org/way/1167733586"
},
{
"id": "osm-n3193927442",
"name": "Công an Diêu Trì",
"category": "cong_an",
"lat": 13.807342,
"lng": 109.144057,
"note": "Khẩn cấp gọi 113.",
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/3193927442"
},
{
"id": "osm-n12585048848",
"name": "Honda Hồng Phước",
"category": "sua_xe",
"phone": "0256 3602788",
"lat": 13.783301,
"lng": 109.21945,
"address": "5 Võ Nguyên Giáp",
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/12585048848"
},
{
"id": "osm-n12587073356",
"name": "Honda Minh Đông",
"category": "sua_xe",
"phone": "0256 3734331",
"lat": 13.809016,
"lng": 109.147398,
"address": "246 Trần Phú",
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/12587073356"
},
{
"id": "osm-n5213796021",
"name": "Quang Thắng",
"category": "sua_xe",
"lat": 13.780179,
"lng": 109.22643,
"address": "71 Ỷ Lan",
"note": "Sửa, thay lốp. Nguồn ghi là tiệm lốp xe.",
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/5213796021"
},
{
"id": "osm-n6551009214",
"name": "Rỗng Motorbike",
"category": "sua_xe",
"lat": 13.769117,
"lng": 109.217208,
"address": "278 Nguyễn Thái Học",
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/6551009214"
},
{
"id": "osm-n3237589176",
"name": "Thảo",
"category": "sua_xe",
"lat": 13.814524,
"lng": 109.147055,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/3237589176"
},
{
"id": "osm-n12724748901",
"name": "Tiệm sửa xe (chưa rõ tên)",
"category": "sua_xe",
"lat": 13.753272,
"lng": 109.212657,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/12724748901"
},
{
"id": "osm-n1561954475",
"name": "Cây xăng",
"category": "xang",
"lat": 13.76744,
"lng": 109.197455,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/1561954475"
},
{
"id": "osm-n2179700470",
"name": "Cây xăng",
"category": "xang",
"lat": 13.791481,
"lng": 109.192372,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/2179700470"
},
{
"id": "osm-n3193974248",
"name": "Cửa hàng Xăng dầu Bảy Cường",
"category": "xang",
"lat": 13.825272,
"lng": 109.157592,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/3193974248"
},
{
"id": "osm-n3198258206",
"name": "Cây Xăng Lam Hồng",
"category": "xang",
"lat": 13.800359,
"lng": 109.144275,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/3198258206"
},
{
"id": "osm-n3201080496",
"name": "Tô Công",
"category": "xang",
"lat": 13.810054,
"lng": 109.147303,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/3201080496"
},
{
"id": "osm-n3231241218",
"name": "Petrolimex",
"category": "xang",
"lat": 13.816458,
"lng": 109.256592,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/3231241218"
},
{
"id": "osm-n3250370159",
"name": "Petrolimex",
"category": "xang",
"lat": 13.795608,
"lng": 109.147887,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/3250370159"
},
{
"id": "osm-n4447788789",
"name": "Petrolimex",
"category": "xang",
"lat": 13.779355,
"lng": 109.22527,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/4447788789"
},
{
"id": "osm-n4782269750",
"name": "Cây xăng",
"category": "xang",
"lat": 13.755269,
"lng": 109.20899,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/4782269750"
},
{
"id": "osm-n5336223721",
"name": "Trạm xăng dầu Trung Hường",
"category": "xang",
"lat": 13.836961,
"lng": 109.141157,
"address": "Quốc lộ 1A - Đường Trần Phú",
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/5336223721"
},
{
"id": "osm-n5336243221",
"name": "Cửa hàng xăng dầu Bình An",
"category": "xang",
"lat": 13.863847,
"lng": 109.131215,
"address": "Quốc lộ 1A - Đường Trần Phú",
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/5336243221"
},
{
"id": "osm-n5336750822",
"name": "Cửa hàng xăng dầu Yến Tùng 4",
"category": "xang",
"lat": 13.852446,
"lng": 109.134897,
"address": "Quốc lộ 1A - Đường Trần Phú",
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/5336750822"
},
{
"id": "osm-n5336777121",
"name": "Cửa hàng xăng dầu số 18 - Petro",
"category": "xang",
"lat": 13.860556,
"lng": 109.137292,
"address": "Quốc lộ 19",
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/5336777121"
},
{
"id": "osm-n6269299685",
"name": "Cây xăng",
"category": "xang",
"lat": 13.751449,
"lng": 109.208334,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/6269299685"
},
{
"id": "osm-n6934936971",
"name": "Cây xăng",
"category": "xang",
"lat": 13.853625,
"lng": 109.134297,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/6934936971"
},
{
"id": "osm-n6950159935",
"name": "Cây xăng",
"category": "xang",
"lat": 13.793768,
"lng": 109.163365,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/6950159935"
},
{
"id": "osm-n6950159937",
"name": "Cây xăng",
"category": "xang",
"lat": 13.823982,
"lng": 109.145368,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/6950159937"
},
{
"id": "osm-n6950159940",
"name": "Cây xăng",
"category": "xang",
"lat": 13.794262,
"lng": 109.16054,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/6950159940"
},
{
"id": "osm-n6950159947",
"name": "Cây xăng",
"category": "xang",
"lat": 13.794198,
"lng": 109.159308,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/6950159947"
},
{
"id": "osm-n8939105741",
"name": "Cây xăng",
"category": "xang",
"lat": 13.772334,
"lng": 109.290517,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/8939105741"
},
{
"id": "osm-n13114402588",
"name": "Cây xăng",
"category": "xang",
"lat": 13.885583,
"lng": 109.258953,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/13114402588"
},
{
"id": "osm-n13114411463",
"name": "Cây xăng",
"category": "xang",
"lat": 13.902359,
"lng": 109.255319,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/13114411463"
},
{
"id": "osm-n13114440844",
"name": "Cây xăng",
"category": "xang",
"lat": 13.896329,
"lng": 109.257087,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/13114440844"
},
{
"id": "osm-n13536119985",
"name": "Cây xăng",
"category": "xang",
"lat": 13.723991,
"lng": 109.16073,
"source": "osm",
"source_url": "https://www.openstreetmap.org/node/13536119985"
}
]$seed$::jsonb) as x(
  id text, name text, category text, phone text, lat double precision, lng double precision, address text, note text, source text, source_url text
);
