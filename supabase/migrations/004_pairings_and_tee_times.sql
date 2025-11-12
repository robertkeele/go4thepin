-- Migration: Pairings and Tee Times
-- Description: Add tables for managing event pairings and tee time groups
-- Version: 004
-- Date: 2025-01-11

-- Create event_pairings table for storing generated pairings
CREATE TABLE IF NOT EXISTS event_pairings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  group_number INT NOT NULL,
  tee_time TIME,
  starting_hole INT DEFAULT 1,
  notes TEXT,
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_event_group UNIQUE(event_id, group_number)
);

-- Create pairing_members table for players in each group
CREATE TABLE IF NOT EXISTS pairing_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pairing_id UUID NOT NULL REFERENCES event_pairings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position INT, -- Order within group (1-4)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_pairing_user UNIQUE(pairing_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_event_pairings_event ON event_pairings(event_id);
CREATE INDEX idx_event_pairings_finalized ON event_pairings(is_finalized);
CREATE INDEX idx_pairing_members_pairing ON pairing_members(pairing_id);
CREATE INDEX idx_pairing_members_user ON pairing_members(user_id);

-- Add updated_at trigger for event_pairings
CREATE TRIGGER update_event_pairings_updated_at
  BEFORE UPDATE ON event_pairings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for event_pairings
ALTER TABLE event_pairings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read pairings
CREATE POLICY "Everyone can view pairings"
  ON event_pairings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete pairings
CREATE POLICY "Admins can manage pairings"
  ON event_pairings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for pairing_members
ALTER TABLE pairing_members ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read pairing members
CREATE POLICY "Everyone can view pairing members"
  ON pairing_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete pairing members
CREATE POLICY "Admins can manage pairing members"
  ON pairing_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE event_pairings IS 'Stores generated pairings/groups for golf events';
COMMENT ON TABLE pairing_members IS 'Stores individual members within each pairing group';
