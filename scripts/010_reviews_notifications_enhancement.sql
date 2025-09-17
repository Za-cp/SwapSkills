-- Add notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'request_received', 'request_accepted', 'session_reminder', 'review_received'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data for the notification
  is_read BOOLEAN DEFAULT false,
  is_email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add review moderation features
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES profiles(id);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- Add review edit history
CREATE TABLE IF NOT EXISTS review_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  old_rating INTEGER,
  old_comment TEXT,
  new_rating INTEGER,
  new_comment TEXT,
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get rating distribution
CREATE OR REPLACE FUNCTION get_rating_distribution(p_user_id UUID)
RETURNS TABLE(rating INTEGER, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT r.rating, COUNT(*)::BIGINT as count
  FROM reviews r
  WHERE r.reviewee_id = p_user_id AND r.is_approved = true
  GROUP BY r.rating
  ORDER BY r.rating DESC;
END;
$$ LANGUAGE plpgsql;
