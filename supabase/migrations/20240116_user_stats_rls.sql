-- Enable RLS
alter table public.user_stats enable row level security;

-- Allow users to view their own stats AND stats of other participants in the same room
create policy "Users can view stats of room participants"
  on public.user_stats for select
  using (
    auth.uid() = user_id OR  -- Can view own stats
    EXISTS (  -- Can view stats of other participants in same room
      SELECT 1 
      FROM room_participants rp1
      WHERE rp1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 
        FROM room_participants rp2
        WHERE rp2.room_id = rp1.room_id
        AND rp2.user_id = user_stats.user_id
      )
    )
  );

-- Allow users to update their own stats
create policy "Users can update their own stats"
  on public.user_stats for update
  using (auth.uid() = user_id);

-- Allow users to insert their own stats
create policy "Users can insert their own stats"
  on public.user_stats for insert
  with check (auth.uid() = user_id); 