-- Create the join_room function
create or replace function join_room(room_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if room exists and has space
  if not exists (
    select 1
    from rooms
    where id = room_id
    and current_participants < max_participants
    and active = true
  ) then
    raise exception 'Room is full or inactive';
  end if;

  -- Increment participant count
  update rooms
  set current_participants = current_participants + 1
  where id = room_id;
end;
$$;

-- Create the leave_room function
create or replace function leave_room(room_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Decrement participant count
  update rooms
  set current_participants = greatest(0, current_participants - 1)
  where id = room_id;
end;
$$; 