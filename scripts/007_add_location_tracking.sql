-- Add location tracking fields to skill_requests table
ALTER TABLE skill_requests 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN share_live_location BOOLEAN DEFAULT FALSE,
ADD COLUMN location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add location tracking to profiles table
ALTER TABLE profiles 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to update location timestamps
CREATE OR REPLACE FUNCTION update_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for location updates
CREATE TRIGGER update_skill_request_location_timestamp
  BEFORE UPDATE OF latitude, longitude ON skill_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_location_timestamp();

CREATE TRIGGER update_profile_location_timestamp
  BEFORE UPDATE OF latitude, longitude ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_location_timestamp();

-- Create index for location-based queries
CREATE INDEX idx_skill_requests_location ON skill_requests USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX idx_profiles_location ON profiles USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Enable earth distance extension for location calculations
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
