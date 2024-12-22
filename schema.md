Project Schema Overview
1. Tables and Their Relationships
room_participants

Tracks users participating in a room.
Columns:
room_id (uuid) → Foreign key to rooms.id
user_id (uuid) → Foreign key to auth.users.id
joined_at (timestamp)
is_focused (boolean)
room_waitlist

Tracks users waiting to join a room.
Columns:
id (uuid) → Primary Key
room_id (uuid) → Foreign key to rooms.id
user_id (uuid) → Foreign key to auth.users.id
joined_at (timestamp)
rooms

Represents the details of a focus room.
Columns:
id (uuid) → Primary Key
name (text)
start_time (timestamp)
duration (integer)
max_participants (integer)
current_participants (integer)
active (boolean)
created_at (timestamp)
room_type (text) → 'FOCUS' or 'SPRINT'
theme (text) → 'DEEP_WORK', 'CREATIVE_FLOW', or 'STUDY_HALL'
sessions

Tracks individual user focus sessions.
Columns:
id (uuid) → Primary Key
user_id (uuid) → Foreign key to auth.users.id
room_id (uuid) → Foreign key to rooms.id
start_time (timestamp)
end_time (timestamp)
duration (integer)
created_at (timestamp)
rewards

Tracks user achievements and badges.
Columns:
id (uuid) → Primary Key
user_id (uuid) → Foreign key to auth.users.id
badge_type (text)
unlocked_at (timestamp)
created_at (timestamp)
profiles

Stores user profile details.
Columns:
id (uuid) → Primary Key
email (text)
name (text)
full_name (text)
avatar_url (text)
timezone (text)
focus_goal (integer)
preferred_focus_time (time)
bio (text)
created_at (timestamp)
updated_at (timestamp)