-- =========================================================================
-- THIRORA - Weekly Quiz Supabase Schema Migration
-- Creates:
--   1. public.quiz_attempts
--   2. public.quiz_topic_performance
--   3. public.quiz_responses
-- Includes RLS policies, indexes, and authenticated role grants.
-- =========================================================================

-- 1. Ensure UUID extension is available
create extension if not exists "uuid-ossp";

-- 2. Create public.quiz_attempts Table
create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references auth.users(id) on delete cascade not null,
  quiz_week integer not null default 1,
  quiz_title text not null default 'Weekly Assessment',
  total_questions integer not null,
  correct_answers integer not null,
  score numeric(5,2) not null,
  percentage numeric(5,2) not null,
  time_taken_seconds integer default 0,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create public.quiz_topic_performance Table
create table if not exists public.quiz_topic_performance (
  id uuid default gen_random_uuid() primary key,
  attempt_id uuid references public.quiz_attempts(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  topic text not null,
  total_questions integer not null,
  correct_answers integer not null,
  percentage numeric(5,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create public.quiz_responses Table
create table if not exists public.quiz_responses (
  id uuid default gen_random_uuid() primary key,
  attempt_id uuid references public.quiz_attempts(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  question_id text not null,
  topic text not null,
  difficulty text default 'Medium',
  question_text text not null,
  selected_answer text not null,
  correct_answer text not null,
  is_correct boolean not null,
  explanation text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Performance Indexes
create index if not exists idx_quiz_attempts_student on public.quiz_attempts(student_id, created_at desc);
create index if not exists idx_quiz_topic_perf_student_topic on public.quiz_topic_performance(student_id, topic);
create index if not exists idx_quiz_responses_attempt on public.quiz_responses(attempt_id);

-- 6. Enable Row Level Security (RLS)
alter table public.quiz_attempts enable row level security;
alter table public.quiz_topic_performance enable row level security;
alter table public.quiz_responses enable row level security;

-- 7. RLS Policies for public.quiz_attempts
create policy "Users can view their own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = student_id);

create policy "Users can insert their own quiz attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = student_id);

create policy "Users can delete their own quiz attempts"
  on public.quiz_attempts for delete
  using (auth.uid() = student_id);

-- 8. RLS Policies for public.quiz_topic_performance
create policy "Users can view their own topic performance"
  on public.quiz_topic_performance for select
  using (auth.uid() = student_id);

create policy "Users can insert their own topic performance"
  on public.quiz_topic_performance for insert
  with check (auth.uid() = student_id);

create policy "Users can delete their own topic performance"
  on public.quiz_topic_performance for delete
  using (auth.uid() = student_id);

-- 9. RLS Policies for public.quiz_responses
create policy "Users can view their own quiz responses"
  on public.quiz_responses for select
  using (auth.uid() = student_id);

create policy "Users can insert their own quiz responses"
  on public.quiz_responses for insert
  with check (auth.uid() = student_id);

create policy "Users can delete their own quiz responses"
  on public.quiz_responses for delete
  using (auth.uid() = student_id);

-- 10. Role Grants for Authenticated Users
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.quiz_attempts to authenticated;
grant select, insert, update, delete on public.quiz_topic_performance to authenticated;
grant select, insert, update, delete on public.quiz_responses to authenticated;
