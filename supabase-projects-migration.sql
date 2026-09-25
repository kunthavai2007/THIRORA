-- =========================================================================
-- THIRORA - Projects Supabase Table & RLS Migration
-- Migration for public.projects table
-- =========================================================================

-- 1. Enable UUID Extension (if not already enabled)
create extension if not exists "uuid-ossp";

-- 2. Create public.projects Table
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  technologies text[] default '{}'::text[],
  project_url text,
  github_url text,
  start_date date,
  end_date date,
  role text default 'Contributor',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.projects enable row level security;

-- 4. RLS Policies (Strict Student Isolation)
create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = student_id);

create policy "Users can insert their own projects"
  on public.projects for insert
  with check (auth.uid() = student_id);

create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = student_id);

create policy "Users can delete their own projects"
  on public.projects for delete
  using (auth.uid() = student_id);

-- 5. Realtime Publication
alter publication supabase_realtime add table public.projects;
