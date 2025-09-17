-- Create challenges system with real-time features

-- Challenge types enum
CREATE TYPE challenge_type AS ENUM ('skill_learning', 'practice_streak', 'community_goal');
CREATE TYPE challenge_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('joined', 'active', 'completed', 'dropped');

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  challenge_type challenge_type NOT NULL,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status challenge_status DEFAULT 'upcoming',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  daily_goal_description TEXT,
  total_points_available INTEGER DEFAULT 100,
  badge_reward TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge participants
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status participant_status DEFAULT 'joined',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(challenge_id, user_id)
);

-- Daily progress tracking
CREATE TABLE IF NOT EXISTS challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES challenge_participants(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  progress_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  notes TEXT,
  proof_url TEXT, -- Optional: image/video proof
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_id, progress_date)
);

-- Challenge leaderboard (materialized view for performance)
CREATE TABLE IF NOT EXISTS challenge_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Challenge achievements/badges
CREATE TABLE IF NOT EXISTS challenge_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL, -- 'streak_master', 'early_bird', 'consistent_learner', etc.
  achievement_name VARCHAR(100) NOT NULL,
  description TEXT,
  badge_icon VARCHAR(50),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for real-time performance
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_date ON challenge_progress(progress_date);
CREATE INDEX IF NOT EXISTS idx_challenge_leaderboard_challenge ON challenge_leaderboard(challenge_id, rank);

-- Function to update participant count
CREATE OR REPLACE FUNCTION update_challenge_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenges 
    SET current_participants = current_participants + 1,
        updated_at = NOW()
    WHERE id = NEW.challenge_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenges 
    SET current_participants = current_participants - 1,
        updated_at = NOW()
    WHERE id = OLD.challenge_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for participant count
CREATE TRIGGER trigger_update_participant_count
  AFTER INSERT OR DELETE ON challenge_participants
  FOR EACH ROW EXECUTE FUNCTION update_challenge_participant_count();

-- Function to update leaderboard
CREATE OR REPLACE FUNCTION update_challenge_leaderboard(challenge_uuid UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM challenge_leaderboard WHERE challenge_id = challenge_uuid;
  
  INSERT INTO challenge_leaderboard (challenge_id, user_id, rank, total_points, current_streak, completion_percentage, last_updated)
  SELECT 
    cp.challenge_id,
    cp.user_id,
    ROW_NUMBER() OVER (ORDER BY cp.total_points DESC, cp.current_streak DESC) as rank,
    cp.total_points,
    cp.current_streak,
    CASE 
      WHEN c.end_date > c.start_date THEN
        (COUNT(prog.completed) FILTER (WHERE prog.completed = true) * 100.0) / 
        GREATEST(1, EXTRACT(days FROM c.end_date - c.start_date))
      ELSE 0
    END as completion_percentage,
    NOW()
  FROM challenge_participants cp
  JOIN challenges c ON cp.challenge_id = c.id
  LEFT JOIN challenge_progress prog ON cp.id = prog.participant_id
  WHERE cp.challenge_id = challenge_uuid
    AND cp.status IN ('joined', 'active', 'completed')
  GROUP BY cp.challenge_id, cp.user_id, cp.total_points, cp.current_streak, c.start_date, c.end_date;
END;
$$ LANGUAGE plpgsql;
