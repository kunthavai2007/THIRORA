-- =========================================================================
-- THIRORA - Experiences Supabase Table & RLS Migration
-- Migration for public.experiences table
-- =========================================================================

-- 1. Enable UUID Extension (if not already enabled)
create extension if not exists "uuid-ossp";

-- 2. Create public.experiences Table
create table if not exists public.experiences (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references auth.users(id) on delete cascade not null,
  experience_type text not null,
  role text not null,
  organization text not null,
  start_date date,
  end_date date,
  description text,
  certificate_url text,
  skills text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.experiences enable row level security;

-- 4. RLS Policies (Strict Student Isolation)
create policy "Users can view their own experiences"
  on public.experiences for select
  using (auth.uid() = student_id);

create policy "Users can insert their own experiences"
  on public.experiences for insert
  with check (auth.uid() = student_id);

create policy "Users can update their own experiences"
  on public.experiences for update
  using (auth.uid() = student_id);

create policy "Users can delete their own experiences"
  on public.experiences for delete
  using (auth.uid() = student_id);

-- 5. Realtime Publication
alter publication supabase_realtime add table public.experiences;
