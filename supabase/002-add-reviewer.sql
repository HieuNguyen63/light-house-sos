-- Cấp quyền duyệt góp ý. Tạo tài khoản trước ở Authentication › Users,
-- thay email bên dưới rồi chạy trong SQL Editor.
insert into public.reviewers (user_id)
select id from auth.users where email = 'email-nguoi-duyet@example.com';
