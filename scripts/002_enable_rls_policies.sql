-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Categories and skills are public read, admin write
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id);

-- User skills policies
CREATE POLICY "Users can view all user skills" ON user_skills FOR SELECT USING (true);
CREATE POLICY "Users can manage own skills" ON user_skills FOR ALL USING (auth.uid() = user_id);

-- Skill requests policies
CREATE POLICY "Users can view all skill requests" ON skill_requests FOR SELECT USING (true);
CREATE POLICY "Users can manage own requests" ON skill_requests FOR ALL USING (auth.uid() = requester_id);

-- Matches policies
CREATE POLICY "Users can view matches they're involved in" ON matches 
  FOR SELECT USING (auth.uid() = teacher_id OR auth.uid() = learner_id);
CREATE POLICY "Teachers can update match status" ON matches 
  FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "System can insert matches" ON matches FOR INSERT WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can view messages in their matches" ON messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = messages.match_id 
      AND (matches.teacher_id = auth.uid() OR matches.learner_id = auth.uid())
    )
  );
CREATE POLICY "Users can send messages in their matches" ON messages 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = messages.match_id 
      AND (matches.teacher_id = auth.uid() OR matches.learner_id = auth.uid())
    )
  );

-- Reviews policies
CREATE POLICY "Users can view all reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their matches" ON reviews 
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = reviews.match_id 
      AND (matches.teacher_id = auth.uid() OR matches.learner_id = auth.uid())
      AND matches.status = 'completed'
    )
  );

-- Public read policies for categories and skills
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true);
