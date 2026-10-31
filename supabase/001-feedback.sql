-- Góp ý cộng đồng. Dán toàn bộ vào Supabase › SQL Editor rồi bấm Run. Chỉ chạy 1 lần.
-- Người lạ: gửi được, chỉ đọc được đánh giá đã duyệt (không thấy lý do báo sai, điểm đề xuất).
-- Người duyệt (có trong bảng reviewers): đọc tất cả, đổi được trạng thái.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('place', 'app', 'new_place')),
  place_id text check (char_length(place_id) <= 40),
  place_name text check (char_length(place_name) <= 120),
  stars smallint check (stars between 1 and 5),
  issues text[] check (cardinality(issues) <= 10),
  text text check (char_length(text) <= 500),
  author text check (char_length(author) <= 60),
  new_place jsonb check (pg_column_size(new_place) <= 2000),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);
create index feedback_status_created_idx on public.feedback (status, created_at desc);

create table public.reviewers (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- Chặn dội góp ý: toàn hệ thống tối đa 30 góp ý mỗi phút
create function public.feedback_limit_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.feedback where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Quá nhiều góp ý, thử lại sau';
  end if;
  return new;
end $$;
create trigger feedback_limit_rate before insert on public.feedback
  for each row execute function public.feedback_limit_rate();

-- Ghi lại ai duyệt, lúc nào. Máy chủ tự ghi nên người dùng không sửa được.
create function public.feedback_stamp_review() returns trigger
language plpgsql as $$
begin
  new.reviewed_at := now();
  new.reviewed_by := auth.uid();
  return new;
end $$;
create trigger feedback_stamp_review before update on public.feedback
  for each row execute function public.feedback_stamp_review();

alter table public.feedback enable row level security;
alter table public.reviewers enable row level security;

revoke all on public.feedback from anon, authenticated;
revoke all on public.reviewers from anon, authenticated;

grant insert (kind, place_id, place_name, stars, issues, text, author, new_place, lat, lng)
  on public.feedback to anon, authenticated;
grant select (id, created_at, place_id, stars, text, author) on public.feedback to anon;
grant select on public.feedback to authenticated;
grant update (status) on public.feedback to authenticated;
grant select on public.reviewers to authenticated;

create policy "ai cũng gửi được, luôn ở trạng thái chờ" on public.feedback
  for insert to anon, authenticated
  with check (status = 'pending');

create policy "ai cũng đọc được đánh giá đã duyệt" on public.feedback
  for select to anon, authenticated
  using (status = 'approved' and kind = 'place');

create policy "người duyệt đọc tất cả" on public.feedback
  for select to authenticated
  using (exists (select 1 from public.reviewers r where r.user_id = (select auth.uid())));

create policy "người duyệt đổi trạng thái" on public.feedback
  for update to authenticated
  using (exists (select 1 from public.reviewers r where r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.reviewers r where r.user_id = (select auth.uid())));

create policy "người duyệt thấy mình trong danh sách" on public.reviewers
  for select to authenticated
  using (user_id = (select auth.uid()));
