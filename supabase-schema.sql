-- ============================================================
-- 匿名评论区（审核模式）建表脚本
-- 使用方法：粘贴到 Supabase 控制台 → SQL Editor → Run
-- ============================================================

-- 评论表
create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  path        text not null,                 -- 文章路径，如 /hello-world/
  nick        text not null check (length(nick) between 1 and 50),
  mail        text check (mail is null or length(mail) <= 100),
  content     text not null check (length(content) between 1 and 2000),
  parent_id   bigint references public.comments(id) on delete set null,  -- 回复的评论
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- 索引：按文章查评论 / 按状态查
create index if not exists comments_path_idx    on public.comments(path);
create index if not exists comments_status_idx  on public.comments(status);

-- 开启行级安全（RLS）
alter table public.comments enable row level security;

-- 游客：只能读到「已审核」的评论
drop policy if exists "public read approved" on public.comments;
create policy "public read approved" on public.comments
  for select using (status = 'approved');

-- 游客：只能提交新评论，且必须处于「待审核」状态（无法自行通过）
drop policy if exists "public insert pending" on public.comments;
create policy "public insert pending" on public.comments
  for insert with check (status = 'pending');

-- 说明：
-- 管理评论请用控制台左侧 Table Editor（表格编辑器）：
--   status 改成 approved = 通过显示；删行 = 删除评论
--   （控制台使用管理员权限，不受上面 RLS 限制）
