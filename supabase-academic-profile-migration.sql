-- =========================================================================
-- THIRORA - Academic Profile Supabase Migration
-- Adds register_number, current_semester, and graduation_date to public.profiles
-- =========================================================================

-- 1. Add missing academic profile columns to public.profiles if they do not exist
alter table public.profiles
  add column if not exists register_number text,
  add column if not exists current_semester text,
  add column if not exists graduation_date text;

-- 2. Optional comments for database schema documentation
comment on column public.profiles.register_number is 'Student university or college registration / roll number';
comment on column public.profiles.current_semester is 'Current academic semester (e.g., 1 to 8)';
comment on column public.profiles.graduation_date is 'Expected or actual graduation date (YYYY-MM-DD)';
