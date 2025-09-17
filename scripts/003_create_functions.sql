-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT)
RETURNS FLOAT AS $$
BEGIN
  RETURN ST_Distance(
    ST_GeogFromText('POINT(' || lon1 || ' ' || lat1 || ')'),
    ST_GeogFromText('POINT(' || lon2 || ' ' || lat2 || ')')
  ) / 1000; -- Convert to kilometers
END;
$$ LANGUAGE plpgsql;

-- Function to update user rating after new review
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET 
    rating = (
      SELECT COALESCE(AVG(rating::DECIMAL), 0) 
      FROM reviews 
      WHERE reviewee_id = NEW.reviewee_id
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE reviewee_id = NEW.reviewee_id
    )
  WHERE id = NEW.reviewee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating when new review is added
CREATE TRIGGER update_rating_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
