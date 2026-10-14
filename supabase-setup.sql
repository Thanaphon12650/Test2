-- รันใน Supabase Dashboard > SQL Editor > New query
-- ตารางนี้เก็บรายการค่าใช้จ่าย โดยผูกแต่ละแถวกับ anonymous auth user
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  category text not null check (category in (
    'อาหาร', 'ค่าเดินทาง', 'ค่าเอกสาร/ถ่ายเอกสาร', 'ปริ้นงาน', 'อุปกรณ์การเรียน', 'อื่น ๆ'
  )),
  amount numeric(12,2) not null check (amount > 0),
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_created_idx
  on public.expenses (user_id, created_at);

alter table public.expenses enable row level security;

-- ลบ policy เดิมชื่อเดียวกันเพื่อให้รันสคริปต์นี้ซ้ำได้
 drop policy if exists "Users can read their own expenses" on public.expenses;
 drop policy if exists "Users can insert their own expenses" on public.expenses;
 drop policy if exists "Users can delete their own expenses" on public.expenses;

create policy "Users can read their own expenses"
  on public.expenses for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own expenses"
  on public.expenses for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own expenses"
  on public.expenses for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ไม่เปิด UPDATE policy เพราะแอปนี้ไม่มีฟังก์ชันแก้ไขรายการ
-- เปิด RLS และใช้ anonymous auth: ผู้ใช้ที่ไม่มี session จะอ่าน/เขียนไม่ได้
