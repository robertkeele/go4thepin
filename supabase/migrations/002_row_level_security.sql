-- Golf League Tracking Application - Row Level Security Policies
-- This migration sets up RLS policies for all tables

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE handicap_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- Everyone can view all profiles (public information)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but allows manual)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Only admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- COURSES POLICIES
-- ============================================================================
-- Everyone can view courses
CREATE POLICY "Courses are viewable by everyone"
  ON courses FOR SELECT
  USING (true);

-- Only admins can insert courses
CREATE POLICY "Admins can insert courses"
  ON courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update courses
CREATE POLICY "Admins can update courses"
  ON courses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete courses
CREATE POLICY "Admins can delete courses"
  ON courses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TEE BOXES POLICIES
-- ============================================================================
-- Everyone can view tee boxes
CREATE POLICY "Tee boxes are viewable by everyone"
  ON tee_boxes FOR SELECT
  USING (true);

-- Only admins can manage tee boxes
CREATE POLICY "Admins can manage tee boxes"
  ON tee_boxes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- HOLES POLICIES
-- ============================================================================
-- Everyone can view holes
CREATE POLICY "Holes are viewable by everyone"
  ON holes FOR SELECT
  USING (true);

-- Only admins can manage holes
CREATE POLICY "Admins can manage holes"
  ON holes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- EVENTS POLICIES
-- ============================================================================
-- Everyone can view events
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- Only admins can create events
CREATE POLICY "Admins can create events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update events
CREATE POLICY "Admins can update events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete events
CREATE POLICY "Admins can delete events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- EVENT REGISTRATIONS POLICIES
-- ============================================================================
-- Everyone can view event registrations
CREATE POLICY "Event registrations are viewable by everyone"
  ON event_registrations FOR SELECT
  USING (true);

-- Users can register for events (create their own registration)
CREATE POLICY "Users can register for events"
  ON event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own registrations
CREATE POLICY "Users can update own registrations"
  ON event_registrations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own registrations (unregister)
CREATE POLICY "Users can delete own registrations"
  ON event_registrations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ROUNDS POLICIES
-- ============================================================================
-- Everyone can view all rounds (for leaderboards)
CREATE POLICY "Rounds are viewable by everyone"
  ON rounds FOR SELECT
  USING (true);

-- Users can create their own rounds
CREATE POLICY "Users can create own rounds"
  ON rounds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rounds
CREATE POLICY "Users can update own rounds"
  ON rounds FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own rounds
CREATE POLICY "Users can delete own rounds"
  ON rounds FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all rounds
CREATE POLICY "Admins can manage all rounds"
  ON rounds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- SCORES POLICIES
-- ============================================================================
-- Everyone can view all scores
CREATE POLICY "Scores are viewable by everyone"
  ON scores FOR SELECT
  USING (true);

-- Users can manage scores for their own rounds
CREATE POLICY "Users can manage own round scores"
  ON scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE rounds.id = scores.round_id AND rounds.user_id = auth.uid()
    )
  );

-- Admins can manage all scores
CREATE POLICY "Admins can manage all scores"
  ON scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TEAMS POLICIES
-- ============================================================================
-- Everyone can view teams
CREATE POLICY "Teams are viewable by everyone"
  ON teams FOR SELECT
  USING (true);

-- Admins can create teams
CREATE POLICY "Admins can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Team captains and admins can update their teams
CREATE POLICY "Captains and admins can update teams"
  ON teams FOR UPDATE
  USING (
    auth.uid() = captain_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete teams
CREATE POLICY "Admins can delete teams"
  ON teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TEAM MEMBERS POLICIES
-- ============================================================================
-- Everyone can view team members
CREATE POLICY "Team members are viewable by everyone"
  ON team_members FOR SELECT
  USING (true);

-- Team captains and admins can add members
CREATE POLICY "Captains and admins can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id AND teams.captain_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Team captains and admins can remove members
CREATE POLICY "Captains and admins can remove members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id AND teams.captain_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TEAM SCORES POLICIES
-- ============================================================================
-- Everyone can view team scores
CREATE POLICY "Team scores are viewable by everyone"
  ON team_scores FOR SELECT
  USING (true);

-- Only admins can manage team scores
CREATE POLICY "Admins can manage team scores"
  ON team_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- HANDICAP HISTORY POLICIES
-- ============================================================================
-- Everyone can view all handicap history
CREATE POLICY "Handicap history is viewable by everyone"
  ON handicap_history FOR SELECT
  USING (true);

-- Only admins and the system can insert handicap history
CREATE POLICY "Admins can insert handicap history"
  ON handicap_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update/delete handicap history
CREATE POLICY "Admins can manage handicap history"
  ON handicap_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
