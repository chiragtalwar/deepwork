-- Enhanced join_room function with better error handling and participant tracking
CREATE OR REPLACE FUNCTION public.join_room(room_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _room_record record;
    _user_id uuid;
BEGIN
    -- Get current user ID
    _user_id := auth.uid();
    
    -- Check if room exists and get its details
    SELECT * INTO _room_record
    FROM rooms
    WHERE id = room_id
    AND active = true
    FOR UPDATE;  -- Lock the row to prevent race conditions
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room not found or inactive');
    END IF;
    
    -- Check if user is already in the room
    IF EXISTS (
        SELECT 1 FROM room_participants 
        WHERE room_id = room_id 
        AND user_id = _user_id
    ) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already joined');
    END IF;
    
    -- Check if room is full
    IF _room_record.current_participants >= _room_record.max_participants THEN
        RETURN jsonb_build_object('success', false, 'message', 'Room is full');
    END IF;
    
    -- Add participant and update count atomically
    INSERT INTO room_participants (room_id, user_id, joined_at)
    VALUES (room_id, _user_id, now());
    
    UPDATE rooms 
    SET current_participants = current_participants + 1
    WHERE id = room_id;
    
    -- Return success with room details
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined room',
        'room', jsonb_build_object(
            'id', _room_record.id,
            'start_time', _room_record.start_time,
            'duration', _room_record.duration
        )
    );
END;
$$; 