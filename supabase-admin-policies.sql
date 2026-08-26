-- ============================================================
-- 管理后台权限策略 —— 在 Supabase Dashboard → SQL Editor 执行一次
-- 前置：
--   1) Authentication → Users → Add user 创建管理员账号（邮箱+密码）
--   2) 把下面两处 'you@example.com' 换成那个管理员邮箱
--      （并同步填到 source/admin/admin.js 的 ADMIN_EMAIL）
--   3) 推荐：Authentication → Settings 关闭 "Allow new users to sign up"
-- 说明：游客/未登录用户仍只能读到 approved 的评论，不受影响。
-- ============================================================

drop policy if exists "admin read all" on public.comments;
create policy "admin read all" on public.comments
  for select to authenticated
  using (auth.jwt() ->> 'email' = 'you@example.com');

drop policy if exists "admin update status" on public.comments;
create policy "admin update status" on public.comments
  for update to authenticated
  using (auth.jwt() ->> 'email' = 'you@example.com')
  with check (auth.jwt() ->> 'email' = 'you@example.com');

drop policy if exists "admin delete" on public.comments;
create policy "admin delete" on public.comments
  for delete to authenticated
  using (auth.jwt() ->> 'email' = 'you@example.com');