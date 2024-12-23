# Focuso.club - Deep Work Community Platform
## Project Overview
ocuso.club is a productivity platform where professionals and students engage in focused deep work sessions. The platform emphasizes clean design, smooth user experience, and effective progress tracking.
## Current Implementation Status
### 1. Authentication System ✅
 Implemented Supabase authentication
 Email/password sign-up and sign-in
 Google OAuth integration
 Protected routes with AuthContext
 Smooth loading states during auth transitions
### 2. Dashboard ✅
 **Focus Time Tracking**
 - Weekly hours display
 - Progress bar toward weekly goal (10h)
 - Real-time updates
 
 **Streak System**
 - Current streak counter
 - Dynamic streak messages
 - Visual streak indicators
 
 **Deep Work Contributions**
 - GitHub-style contribution graph
 - 52-week history
 - Color-coded intensity levels
 - Hover states with detailed info
 
 **Analytics**
 - Weekly focus hours chart
 - Session distribution (coming soon)
 - Real-time data updates
### 3. Room System ✅
 **Room Scheduling**
 - Automatic room creation
 - Multiple duration options (25m, 50m, 90m)
 - Real-time participant tracking
 
 **Room UI**
 - Clean, minimal interface
 - Loading states
 - Participant counters
 - Progress bars
 - Theme support
### 4. Real-time Features ✅
 Supabase real-time subscriptions
 Background data refresh
 Tab visibility handling
 Loading state management
## Technical Implementation Details
### Frontend Architecture
. **State Management**
typescript
// Auth Context
const { user, loading: authLoading } = useAuth();
// Loading States
const { isLoading, withLoading, hasInitialData } = useLoadingState();

2. **Real-time Updates**

// Visibility change handling
- const handleVisibilityChange = () => {
- if (document.visibilityState === 'visible') {
- fetchData(true); // Background refresh
- }
- };

3. **Data Fetching Pattern**
- const fetchData = async (isBackgroundRefresh = false) => {
- if (fetchInProgress.current) return;
- fetchInProgress.current = true;


4. **Database Schema**
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


## Deployment
- Frontend deployed on Vercel
- Database hosted on Supabase
- Environment variables properly configured
- Client-side routing handled with vercel.json

## Current Challenges & Next Steps
1. **Performance Optimization**
   - Implement better loading states
   - Optimize real-time subscriptions
   - Add data caching

2. **Feature Pipeline**
   - Session distribution chart
   - More detailed analytics
   - User preferences
   - Room themes

3. **UI Enhancements**
   - Mobile responsiveness improvements
   - Dark/light theme support
   - More interactive elements

## Development Guidelines
1. Always implement proper loading states
2. Use background fetching for data updates
3. Handle cleanup in useEffect hooks
4. Maintain consistent error handling
5. Follow the established component patterns

## Tech Stack
- React + TypeScript
- Tailwind CSS
- ShadcnUI Components
- Supabase (Auth + Database)
- Vercel (Hosting)