-- Create sessions table to track completed sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create streaks table to track user streaks
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_session_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create function to update streaks
CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
BEGIN
  -- Get or create streak record for user
  INSERT INTO streaks (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update streak
  WITH streak_data AS (
    SELECT
      CASE
        WHEN last_session_date = CURRENT_DATE - INTERVAL '1 day'
          THEN current_streak + 1
        WHEN last_session_date = CURRENT_DATE
          THEN current_streak
        ELSE 1
      END as new_streak
    FROM streaks
    WHERE user_id = NEW.user_id
  )
  UPDATE streaks
  SET
    current_streak = streak_data.new_streak,
    longest_streak = GREATEST(longest_streak, streak_data.new_streak),
    last_session_date = CURRENT_DATE,
    updated_at = now()
  FROM streak_data
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for streak updates
CREATE TRIGGER update_streak_trigger
AFTER INSERT ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_streak(); 