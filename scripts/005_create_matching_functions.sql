-- Function to calculate compatibility score between a request and potential teacher
CREATE OR REPLACE FUNCTION calculate_compatibility_score(
  request_skill_id UUID,
  request_level TEXT,
  request_location_lat FLOAT DEFAULT NULL,
  request_location_lon FLOAT DEFAULT NULL,
  request_max_distance INTEGER DEFAULT 50,
  request_is_remote BOOLEAN DEFAULT false,
  teacher_skill_id UUID,
  teacher_level TEXT,
  teacher_years_experience INTEGER,
  teacher_location_lat FLOAT DEFAULT NULL,
  teacher_location_lon FLOAT DEFAULT NULL,
  teacher_rating DECIMAL DEFAULT 0
)
RETURNS DECIMAL AS $$
DECLARE
  skill_match_score DECIMAL := 0;
  level_compatibility_score DECIMAL := 0;
  distance_score DECIMAL := 0;
  experience_score DECIMAL := 0;
  rating_score DECIMAL := 0;
  total_score DECIMAL := 0;
  distance_km DECIMAL := 0;
BEGIN
  -- Skill match (40% weight)
  IF request_skill_id = teacher_skill_id THEN
    skill_match_score := 40;
  ELSE
    skill_match_score := 0;
  END IF;
  
  -- Level compatibility (20% weight)
  CASE 
    WHEN request_level = 'beginner' AND teacher_level IN ('intermediate', 'advanced', 'expert') THEN
      level_compatibility_score := 20;
    WHEN request_level = 'intermediate' AND teacher_level IN ('advanced', 'expert') THEN
      level_compatibility_score := 20;
    WHEN request_level = 'advanced' AND teacher_level = 'expert' THEN
      level_compatibility_score := 20;
    WHEN request_level = teacher_level THEN
      level_compatibility_score := 15; -- Same level gets slightly lower score
    ELSE
      level_compatibility_score := 5; -- Teacher level below request level
  END CASE;
  
  -- Distance score (20% weight)
  IF request_is_remote THEN
    distance_score := 20; -- Full score for remote
  ELSIF request_location_lat IS NOT NULL AND request_location_lon IS NOT NULL 
        AND teacher_location_lat IS NOT NULL AND teacher_location_lon IS NOT NULL THEN
    distance_km := calculate_distance(request_location_lat, request_location_lon, 
                                    teacher_location_lat, teacher_location_lon);
    IF distance_km <= request_max_distance THEN
      -- Closer is better, max score at 0km, min score at max_distance
      distance_score := 20 * (1 - (distance_km / request_max_distance));
    ELSE
      distance_score := 0; -- Outside acceptable range
    END IF;
  ELSE
    distance_score := 10; -- Partial score if location data missing
  END IF;
  
  -- Experience score (10% weight)
  CASE
    WHEN teacher_years_experience >= 5 THEN experience_score := 10;
    WHEN teacher_years_experience >= 2 THEN experience_score := 8;
    WHEN teacher_years_experience >= 1 THEN experience_score := 6;
    ELSE experience_score := 4;
  END CASE;
  
  -- Rating score (10% weight)
  IF teacher_rating >= 4.5 THEN rating_score := 10;
  ELSIF teacher_rating >= 4.0 THEN rating_score := 8;
  ELSIF teacher_rating >= 3.5 THEN rating_score := 6;
  ELSIF teacher_rating >= 3.0 THEN rating_score := 4;
  ELSE rating_score := 2;
  END IF;
  
  total_score := skill_match_score + level_compatibility_score + distance_score + experience_score + rating_score;
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Function to find matches for a skill request
CREATE OR REPLACE FUNCTION find_matches_for_request(request_id_param UUID)
RETURNS TABLE (
  teacher_id UUID,
  teacher_skill_id UUID,
  compatibility_score DECIMAL,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.user_id as teacher_id,
    us.skill_id as teacher_skill_id,
    calculate_compatibility_score(
      sr.skill_id,
      sr.skill_level_needed::TEXT,
      ST_Y(sr.location_coordinates::geometry),
      ST_X(sr.location_coordinates::geometry),
      sr.max_distance_km,
      sr.is_remote,
      us.skill_id,
      us.level::TEXT,
      us.years_experience,
      ST_Y(p.location_coordinates::geometry),
      ST_X(p.location_coordinates::geometry),
      p.rating
    ) as compatibility_score,
    CASE 
      WHEN sr.location_coordinates IS NOT NULL AND p.location_coordinates IS NOT NULL THEN
        ST_Distance(sr.location_coordinates, p.location_coordinates) / 1000
      ELSE NULL
    END as distance_km
  FROM skill_requests sr
  JOIN user_skills us ON sr.skill_id = us.skill_id
  JOIN profiles p ON us.user_id = p.id
  WHERE sr.id = request_id_param
    AND sr.requester_id != us.user_id -- Don't match with self
    AND us.can_teach = true
    AND p.is_available = true
    AND calculate_compatibility_score(
      sr.skill_id,
      sr.skill_level_needed::TEXT,
      ST_Y(sr.location_coordinates::geometry),
      ST_X(sr.location_coordinates::geometry),
      sr.max_distance_km,
      sr.is_remote,
      us.skill_id,
      us.level::TEXT,
      us.years_experience,
      ST_Y(p.location_coordinates::geometry),
      ST_X(p.location_coordinates::geometry),
      p.rating
    ) >= 30 -- Minimum compatibility threshold
  ORDER BY compatibility_score DESC, distance_km ASC NULLS LAST
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
