-- Table: profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT,
    focus_goal INTEGER DEFAULT 2,
    preferred_focus_time TEXT DEFAULT 'morning',
    bio TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Table: rewards
CREATE TABLE rewards (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    badge_type TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Table: room_participants
CREATE TABLE room_participants (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_focused BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'focus',
    current_focus_task TEXT,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Table: room_waitlist
CREATE TABLE room_waitlist (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Table: rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL,
    max_participants INTEGER DEFAULT 5,
    current_participants INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    room_type TEXT DEFAULT 'FOCUS',
    theme TEXT DEFAULT 'DEEP_WORK',
    CONSTRAINT room_type_check CHECK (room_type IN ('FOCUS', 'OTHER_TYPE')),
    CONSTRAINT theme_check CHECK (theme IN ('DEEP_WORK', 'OTHER_THEME'))
);

-- Table: sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    room_id UUID NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth.users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);
