-- =========================================================================
-- Logro - PostgreSQL / Supabase Production Schema
-- Cross-Device Authentication, Multi-Device Sessions, and Realtime Sync
-- =========================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. User Profiles Table (Linked with Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null unique,
  phone text,
  college_name text,
  department text,
  target_role text default 'Software Engineer',
  cgpa text,
  bio text,
  avatar_color text default '#173f70',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 3. Multi-Device Sessions & Device Tracking
create table if not exists public.user_devices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  device_id text not null,
  device_name text not null,
  device_type text not null check (device_type in ('Desktop', 'Mobile', 'Tablet')),
  browser text not null,
  os text not null,
  location text,
  ip_address text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  is_current_device boolean default false,
  last_active timestamp with time zone default timezone('utc'::text, now()) not null,
  first_seen timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for user_devices
alter table public.user_devices enable row level security;

create policy "Users can view their own devices"
  on public.user_devices for select
  using (auth.uid() = user_id);

create policy "Users can insert/update their own devices"
  on public.user_devices for all
  using (auth.uid() = user_id);

-- 4. User Notifications & Security Alerts
create table if not exists public.user_notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null default 'system' check (type in ('security', 'quiz', 'placement', 'system')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  title text not null,
  message text not null,
  action_url text,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for user_notifications
alter table public.user_notifications enable row level security;

create policy "Users can view and manage their notifications"
  on public.user_notifications for all
  using (auth.uid() = user_id);

-- 5. Student Academic & Career Data Storage (Sync Table)
create table if not exists public.academic_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  user_email text not null,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for academic_profiles
alter table public.academic_profiles enable row level security;

create policy "Users can manage their academic sync data"
  on public.academic_profiles for all
  using (auth.uid() = user_id);

-- 6. Student Projects Table
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references auth.users on delete cascade not null,
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

-- Enable RLS for projects
alter table public.projects enable row level security;

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

-- 7. Student Experiences Table (Internships & Workshops)
create table if not exists public.experiences (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references auth.users on delete cascade not null,
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

-- Enable RLS for experiences
alter table public.experiences enable row level security;

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

-- 8. Realtime Publication Setup
alter publication supabase_realtime add table public.user_notifications;
alter publication supabase_realtime add table public.user_devices;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.experiences;


