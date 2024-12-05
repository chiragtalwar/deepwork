## **Project Overview**

**App Name**: Haven  
**Purpose**: Haven is a web app designed to foster productivity by allowing users to join virtual deep work sessions. The app incorporates serene aesthetics, video conferencing, session scheduling, progress tracking, and a reward system to create an immersive and delightful experience.

---

## **App Functionality Overview**

### **1. Landing Page**
- First interaction for users; visually appealing and calming.
- Includes Call-to-Actions (CTAs) for signing up and signing in.
- Responsive for desktop, tablet, and mobile.

### **2. Authorization**
- Google OAuth and email/password-based sign-up/sign-in.
- Secure session management using JWT.
- Password recovery option via email.

### **3. Profile Creation**
- Minimal information collection (Name, Profile Picture, Time Zone).
- Onboarding flow to introduce app features after profile creation.

### **4. Deep Work Sessions**
- Scheduled rooms (1-hour and 30-minute durations) available every hour.
- Maximum of 5 participants per room.
- Real-time video conferencing.
- Room timer and participant list visible.
- Post-session logs for progress tracking.

### **5. Progress Analytics**
- Dashboard with interactive graphs and insights.
- Streak visualization and milestone tracking.
- Session details (date, duration, participants) logged and displayed.

### **6. Reward System**
- Badges, points, and unlockable themes based on productivity milestones.

---

## **Tech Stack**

### **Frontend**
1. **React.js** for UI components.
2. **ShadCN UI** for pre-built, accessible components with Tailwind CSS integration.
3. **Tailwind CSS** for styling (utility-first, responsive).
4. **Lucide Icons** for modern, lightweight icons.
5. **Recharts** for interactive data visualizations.

### **Backend**
1. **Node.js** with **Express.js** for API development.
2. **PostgreSQL** (via Supabase) for user data, session logs, and analytics.
3. **WebSocket** for real-time room updates.
4. **Daily.co** or **Jitsi Meet** for video conferencing integration.
5. **Redis** for caching (optional, for performance optimization).

### **Hosting**
1. **Frontend**: Vercel (optimized for React and Tailwind).
2. **Backend**: Render or Fly.io (scalable, free tiers available).
3. **Database**: Supabase (PostgreSQL as a service).

---

## **Detailed Instructions**

### **Frontend Instructions**

#### **Landing Page**
1. **Design**:
   - Use **ShadCN UI** for layout components (Navbar, Hero Section, Footer).
   - Use **Lucide Icons** for buttons and navigation.
   - Display a serene background with calming gradients.
2. **Features**:
   - CTAs: "Sign Up" and "Sign In" buttons linked to the auth flow.
   - Highlight app features (e.g., productivity tracking, deep work rooms).
   - Responsive for all screen sizes using Tailwind’s breakpoints.

---

#### **Sign-Up/Sign-In**
1. **Form Design**:
   - Google OAuth button.
   - Email/password fields with Tailwind-styled inputs.
2. **Validation**:
   - Client-side validation for input fields (e.g., email format, password length).

---

#### **Profile Creation**
1. **Form Design**:
   - Fields: Name, Profile Picture (optional), Time Zone.
   - Tailwind-styled progress bar to indicate completion.
2. **Onboarding**:
   - Display a brief walkthrough of app features (carousel with skip option).

---

#### **Room Interface**
1. **Room Design**:
   - Use **ShadCN cards** to display the room timer, participant list, and controls.
   - Embed video using **Daily.co** or **Jitsi Meet** iframe API.
   - Timer UI:
     - Circular progress bar with remaining time.
   - Participant List:
     - Names and status indicators (focus/active) using Lucide icons.
2. **Controls**:
   - Buttons for video/audio toggle, leave room, and share room link.

---

#### **Dashboard**
1. **Design**:
   - Display interactive graphs using **Recharts**:
     - Line chart for hours worked over time.
     - Bar chart for weekly/monthly streaks.
   - Highlight milestones and badges earned.
2. **Features**:
   - "View Session Logs" button to see detailed session data.
   - Display unlockable themes and progress visually.

---

### **Backend Instructions**

#### **Authentication**
1. **Sign-Up/Sign-In**:
   - Implement Google OAuth using Supabase's built-in auth.
   - For email/password, use bcrypt for hashing passwords.
2. **Session Management**:
   - Use JWT for managing user sessions securely.
3. **Password Recovery**:
   - Generate and email a one-time reset link.

---

#### **Room Scheduling**
1. **Room Creation**:
   - Automatically schedule rooms every hour (1-hour and 30-minute options).
   - Use **node-cron** to trigger room creation jobs.
   - Save room metadata (start time, duration, max participants) in PostgreSQL.
2. **Real-Time Updates**:
   - Use WebSocket for:
     - Notifying participants when someone joins or leaves.
     - Syncing timers across all participants.

---

#### **Video Conferencing**
1. **API Integration**:
   - Use **Daily.co** or **Jitsi Meet**:
     - Generate unique room URLs.
     - Embed video in the frontend via iframe.
2. **Features**:
   - Video/audio toggle.
   - Participant list synced with the backend.

---

#### **Progress Logging**
1. **Session Logs**:
   - Log start time, duration, and participants for each session.
   - Store logs in PostgreSQL for future analytics.
2. **Analytics API**:
   - Calculate streaks and milestones.
   - Provide aggregated stats (e.g., total hours worked).

---

#### **Reward System**
1. **Badges**:
   - Define milestones (e.g., 5-hour streak, 10 sessions).
   - Assign badges and save them in the user profile.
2. **Unlockable Content**:
   - Save unlocked themes and soundscapes in the database.
   - Provide API endpoints for fetching unlockable content.

---

### **Database Design**

#### **Tables**
1. **Users**:
   - `id`, `name`, `email`, `password_hash`, `profile_picture`, `time_zone`.
2. **Rooms**:
   - `id`, `start_time`, `duration`, `max_participants`, `active`.
3. **Sessions**:
   - `id`, `user_id`, `room_id`, `start_time`, `end_time`, `duration`.
4. **Rewards**:
   - `id`, `user_id`, `badge`, `unlockable_content`.

---

### **Testing Instructions**
1. **Frontend**:
   - Cross-browser compatibility (Chrome, Safari, Edge).
   - Responsive design tests on desktop, tablet, and mobile.
2. **Backend**:
   - Unit tests for APIs.
   - Load testing for room creation and video integration.

---

### **Deployment**
1. **Frontend**:
   - Deploy on **Vercel** with proper environment variables for API endpoints.
2. **Backend**:
   - Deploy on **Render** or **Fly.io**.
   - Set up Supabase for database hosting and authentication.