-- Create badges table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  requirement_type VARCHAR(50) NOT NULL, -- e.g., 'sessions', 'hours', 'streak'
  requirement_value INTEGER NOT NULL, -- target value to earn badge
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_badges table for tracking earned badges
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create themes table
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  preview_url TEXT,
  requirement_type VARCHAR(50), -- NULL means default theme
  requirement_value INTEGER,
  css_variables JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_themes table for tracking unlocked themes
CREATE TABLE user_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT false,
  UNIQUE(user_id, theme_id)
);

-- Insert default badges
INSERT INTO badges (name, description, requirement_type, requirement_value) VALUES
('Early Bird', 'Complete your first session', 'sessions', 1),
('Focus Master', 'Complete 10 sessions', 'sessions', 10),
('Time Lord', 'Accumulate 24 hours of focus time', 'hours', 24),
('Streak Starter', 'Maintain a 3-day streak', 'streak', 3),
('Consistency King', 'Maintain a 7-day streak', 'streak', 7);

-- Insert default themes
INSERT INTO themes (name, description, requirement_type, requirement_value, css_variables) VALUES
('Light', 'Default light theme', NULL, NULL, '{"--background": "0 0% 100%", "--foreground": "222.2 84% 4.9%"}'),
('Dark', 'Default dark theme', NULL, NULL, '{"--background": "222.2 84% 4.9%", "--foreground": "210 40% 98%"}'),
('Forest', 'Calming green theme', 'hours', 5, '{"--background": "120 50% 97%", "--foreground": "120 80% 5%"}'),
('Ocean', 'Deep blue theme', 'sessions', 20, '{"--background": "200 50% 97%", "--foreground": "200 80% 5%"}'); 