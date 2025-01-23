create table public.user_stats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  total_sessions integer default 0,
  current_streak integer default 0,
  weekly_focus_minutes integer default 0,
  last_session_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster lookups
create index user_stats_user_id_idx on public.user_stats(user_id);

-- Add unique constraint on user_id
alter table public.user_stats add constraint user_stats_user_id_key unique (user_id);

-- Set up RLS policies
alter table public.user_stats enable row level security;

create policy "Users can view their own stats"
  on public.user_stats for select
  using (auth.uid() = user_id);

create policy "Users can update their own stats"
  on public.user_stats for update
  using (auth.uid() = user_id);

create policy "Users can insert their own stats"
  on public.user_stats for insert
  with check (auth.uid() = user_id); 