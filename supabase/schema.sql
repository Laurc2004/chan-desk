-- ChanDesk 决策档案表（Supabase SQL Editor 执行）
create table if not exists public.decisions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null default encode(gen_random_bytes(8), 'hex'), -- 浏览器匿名会话
  symbol text not null,
  granularity text not null,
  signal_kind text not null,
  signal_ts bigint,
  decision text not null check (decision in ('adopt', 'ignore')),
  reason text not null default '',
  entry_price numeric,
  -- 事后回看用：记录决策时刻的统计快照
  stats_snapshot jsonb
);

-- 匿名可读写（demo 场景）：只允许插入+查询，不允许 update/delete
alter table public.decisions enable row level security;

create policy "anon insert" on public.decisions
  for insert to anon with check (true);

create policy "anon select" on public.decisions
  for select to anon using (true);

-- 数据保留：30 天自动清理（可选）
-- select cron.schedule('cleanup-decisions', '30 days', $$delete from public.decisions where created_at < now() - interval '30 days'$$);
