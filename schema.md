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

Table: user_stats
Description: This table stores statistics for users, including their session counts, streaks, and focus minutes.

Columns:

id (uuid, primary key): Unique identifier for the user stats record, automatically generated.
user_id (uuid, foreign key): Identifier for the user, referencing auth.users(id).
total_sessions (integer): Total number of sessions the user has completed, default is 0.
current_streak (integer): Current streak of consecutive sessions, default is 0.
weekly_focus_minutes (integer): Total focus minutes logged in the current week, default is 0.
last_session_date (timestamp with time zone): Timestamp of the last session completed by the user.
created_at (timestamp with time zone): Timestamp of when the record was created, default is current time.
updated_at (timestamp with time zone): Timestamp of the last update to the record, default is current time.
Foreign Key:

user_id references auth.users(id) and is set to cascade on delete.
Indexes:


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