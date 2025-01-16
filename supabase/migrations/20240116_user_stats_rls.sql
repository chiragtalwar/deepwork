-- Enable RLS
alter table public.user_stats enable row level security;

-- Allow users to view their own stats
create policy "Users can view their own stats"
  on public.user_stats for select
  using (auth.uid() = user_id);

-- Allow users to update their own stats
create policy "Users can update their own stats"
  on public.user_stats for update
  using (auth.uid() = user_id);

-- Allow users to insert their own stats
create policy "Users can insert their own stats"
  on public.user_stats for insert
  with check (auth.uid() = user_id); 