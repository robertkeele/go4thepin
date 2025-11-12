-- Golf League Tracking Application - Initial Database Schema
-- This migration creates all the necessary tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  ghin_number TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  current_handicap_index DECIMAL(4, 1),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- COURSES TABLE
-- ============================================================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  total_par INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TEE BOXES TABLE
-- ============================================================================
CREATE TABLE tee_boxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  course_rating DECIMAL(4, 1) NOT NULL,
  slope_rating INTEGER NOT NULL,
  total_yardage INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- HOLES TABLE
-- ============================================================================
CREATE TABLE holes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
  par INTEGER NOT NULL CHECK (par IN (3, 4, 5)),
  handicap_index INTEGER NOT NULL CHECK (handicap_index >= 1 AND handicap_index <= 18),
  yardage_blue INTEGER,
  yardage_white INTEGER,
  yardage_red INTEGER,
  UNIQUE(course_id, hole_number)
);

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  tee_box_id UUID NOT NULL REFERENCES tee_boxes(id) ON DELETE RESTRICT,
  scoring_format TEXT NOT NULL DEFAULT 'stroke' CHECK (scoring_format IN ('stroke', 'match', 'stableford')),
  event_type TEXT NOT NULL DEFAULT 'individual' CHECK (event_type IN ('individual', 'team', 'both')),
  is_team_event BOOLEAN NOT NULL DEFAULT FALSE,
  max_participants INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EVENT REGISTRATIONS TABLE
-- ============================================================================
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'cancelled')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ============================================================================
-- ROUNDS TABLE
-- ============================================================================
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  tee_box_id UUID NOT NULL REFERENCES tee_boxes(id) ON DELETE RESTRICT,
  played_date DATE NOT NULL,
  total_score INTEGER NOT NULL,
  course_handicap DECIMAL(4, 1),
  adjusted_score INTEGER,
  score_differential DECIMAL(5, 2),
  is_posted_for_handicap BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SCORES TABLE (hole-by-hole)
-- ============================================================================
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  hole_id UUID NOT NULL REFERENCES holes(id) ON DELETE RESTRICT,
  strokes INTEGER NOT NULL CHECK (strokes > 0 AND strokes <= 15),
  putts INTEGER CHECK (putts >= 0),
  fairway_hit BOOLEAN,
  gir BOOLEAN,
  UNIQUE(round_id, hole_id)
);

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  captain_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  season_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, season_year)
);

-- ============================================================================
-- TEAM MEMBERS TABLE
-- ============================================================================
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ============================================================================
-- TEAM SCORES TABLE
-- ============================================================================
CREATE TABLE team_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  total_points DECIMAL(6, 2),
  ranking INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, event_id)
);

-- ============================================================================
-- HANDICAP HISTORY TABLE
-- ============================================================================
CREATE TABLE handicap_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  handicap_index DECIMAL(4, 1) NOT NULL,
  calculated_date DATE NOT NULL,
  rounds_used INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for better query performance
-- ============================================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

CREATE INDEX idx_tee_boxes_course_id ON tee_boxes(course_id);
CREATE INDEX idx_holes_course_id ON holes(course_id);
CREATE INDEX idx_holes_course_hole_number ON holes(course_id, hole_number);

CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_course_id ON events(course_id);
CREATE INDEX idx_events_created_by ON events(created_by);

CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user_id ON event_registrations(user_id);

CREATE INDEX idx_rounds_user_id ON rounds(user_id);
CREATE INDEX idx_rounds_event_id ON rounds(event_id);
CREATE INDEX idx_rounds_played_date ON rounds(played_date);
CREATE INDEX idx_rounds_is_posted ON rounds(is_posted_for_handicap);

CREATE INDEX idx_scores_round_id ON scores(round_id);
CREATE INDEX idx_scores_hole_id ON scores(hole_id);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

CREATE INDEX idx_team_scores_team_id ON team_scores(team_id);
CREATE INDEX idx_team_scores_event_id ON team_scores(event_id);

CREATE INDEX idx_handicap_history_user_id ON handicap_history(user_id);
CREATE INDEX idx_handicap_history_user_date ON handicap_history(user_id, calculated_date DESC);

-- ============================================================================
-- FUNCTIONS for automatic updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS for automatic updated_at timestamp
-- ============================================================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION to automatically create profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'member');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER to create profile on user signup
-- ============================================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE courses IS 'Golf courses';
COMMENT ON TABLE tee_boxes IS 'Different tee boxes for each course';
COMMENT ON TABLE holes IS 'Individual hole information for each course';
COMMENT ON TABLE events IS 'Golf league events and tournaments';
COMMENT ON TABLE event_registrations IS 'User registrations for events';
COMMENT ON TABLE rounds IS 'Individual golf rounds played';
COMMENT ON TABLE scores IS 'Hole-by-hole scores for each round';
COMMENT ON TABLE teams IS 'Teams for team competitions';
COMMENT ON TABLE team_members IS 'Team membership';
COMMENT ON TABLE team_scores IS 'Team scores for events';
COMMENT ON TABLE handicap_history IS 'Historical handicap index tracking';
