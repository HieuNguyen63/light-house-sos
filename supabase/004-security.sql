-- Vá bảo mật sau đợt thử tấn công. Dán toàn bộ vào SQL Editor rồi bấm Run. Chỉ chạy 1 lần, sau 003.
-- 1. new_place sai kiểu dữ liệu từng làm sập trang duyệt: chỉ nhận đúng các ô chữ của form.
-- 2. Trước đây một người có thể gửi đủ 30 góp ý mỗi phút, làm người khác không gửi được và làm đầy database.

create function public.feedback_new_place_valid(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select value is null or (
    jsonb_typeof(value) = 'object'
    and not exists (
      select 1 from jsonb_each(value) as e(k, v)
      where e.k not in ('name', 'phone', 'hours', 'price', 'address', 'mapLink', 'source')
         or jsonb_typeof(e.v) not in ('string', 'null')
    )
  )
$$;

-- Gỡ các dòng sai dạng nếu có, rồi mới bật ràng buộc
update public.feedback set new_place = null where not public.feedback_new_place_valid(new_place);
alter table public.feedback add constraint feedback_new_place_shape check (public.feedback_new_place_valid(new_place));

-- Chỉ lưu mã băm của IP để đếm số lần gửi, không lưu IP gốc. Người lạ không đọc được cột này.
alter table public.feedback add column ip_hash text;
create index feedback_ip_created_idx on public.feedback (ip_hash, created_at desc);
create index feedback_created_idx on public.feedback (created_at desc);

create or replace function public.feedback_limit_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  -- Cloudflare tự ghi đè header này nên người gửi không giả được
  ip text := coalesce(headers ->> 'cf-connecting-ip', split_part(headers ->> 'x-forwarded-for', ',', 1), 'unknown');
begin
  new.ip_hash := encode(sha256(convert_to('hai-dang-sos:' || trim(ip), 'UTF8')), 'hex');
  if (select count(*) from public.feedback f where f.ip_hash = new.ip_hash and f.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Bạn gửi hơi nhanh, thử lại sau một phút';
  end if;
  if (select count(*) from public.feedback f where f.ip_hash = new.ip_hash and f.created_at > now() - interval '1 day') >= 30 then
    raise exception 'Hôm nay bạn đã gửi nhiều góp ý, thử lại vào ngày mai';
  end if;
  if (select count(*) from public.feedback f where f.created_at > now() - interval '1 minute') >= 120 then
    raise exception 'Hệ thống đang nhận quá nhiều góp ý, thử lại sau';
  end if;
  -- Chặn làm đầy database: nhiều nhất 5.000 góp ý chờ duyệt
  if (select count(*) from public.feedback f where f.status = 'pending') >= 5000 then
    raise exception 'Hệ thống đang tạm ngừng nhận góp ý';
  end if;
  return new;
end $$;
