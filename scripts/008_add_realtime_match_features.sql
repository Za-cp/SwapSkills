-- Add presence tracking table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add typing indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- Add session scheduling table
CREATE TABLE IF NOT EXISTS scheduled_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  proposed_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add progress tracking table
CREATE TABLE IF NOT EXISTS skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  total_lessons INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add match activity tracking
CREATE TABLE IF NOT EXISTS match_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Update messages table to include read receipts
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Add match health status to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE matches ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'active' CHECK (health_status IN ('active', 'dormant', 'inactive'));

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own presence" ON user_presence
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can see typing indicators for their matches" ON typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = typing_indicators.match_id 
      AND (matches.teacher_id = auth.uid() OR matches.learner_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage typing indicators for their matches" ON typing_indicators
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can see sessions for their matches" ON scheduled_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = scheduled_sessions.match_id 
      AND (matches.teacher_id = auth.uid() OR matches.learner_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage sessions for their matches" ON scheduled_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = scheduled_sessions.match_id 
      AND (matches.teacher_id = auth.uid() OR matches.learner_id = auth.uid())
    )
  );

CREATE POLICY "Users can see progress for their matches" ON skill_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = skill_progress.match_id 
      AND (matches.teacher_id = auth.uid() OR matches.learner_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their own progress" ON skill_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can see activity for their matches" ON match_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_activity.match_id 
      AND (matches.teacher_id = auth.uid() OR matches.learner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create activity for their matches" ON match_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Functions for match health updates
CREATE OR REPLACE FUNCTION update_match_health()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE matches 
  SET 
    last_activity = NOW(),
    health_status = CASE 
      WHEN NOW() - last_activity > INTERVAL '7 days' THEN 'dormant'
      WHEN NOW() - last_activity > INTERVAL '30 days' THEN 'inactive'
      ELSE 'active'
    END
  WHERE id = NEW.match_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update match health on new messages
CREATE TRIGGER update_match_health_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_match_health();

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(user_uuid UUID, online BOOLEAN)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_presence (user_id, is_online, last_seen, updated_at)
  VALUES (user_uuid, online, NOW(), NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_online = online,
    last_seen = CASE WHEN online THEN user_presence.last_seen ELSE NOW() END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
