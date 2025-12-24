-- =============================================
-- RSVP SYSTEM ENHANCEMENT MIGRATION
-- =============================================

-- Update event_attendees status enum to include new RSVP statuses
ALTER TABLE event_attendees 
DROP CONSTRAINT IF EXISTS event_attendees_status_check;

ALTER TABLE event_attendees
ADD CONSTRAINT event_attendees_status_check 
CHECK (status IN ('going', 'interested', 'not_going', 'waitlist', 'attending', 'checked_in', 'completed'));

-- Add waitlist_position for managing waitlist order
ALTER TABLE event_attendees
ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;

-- Add index for waitlist queries
CREATE INDEX IF NOT EXISTS idx_event_attendees_waitlist ON event_attendees(event_id, waitlist_position) 
WHERE status = 'waitlist';

-- =============================================
-- EVENT REMINDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '2h', '1h', 'custom')),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id, reminder_type)
);

CREATE INDEX idx_event_reminders_scheduled ON event_reminders(scheduled_time, sent) 
WHERE sent = FALSE;

CREATE INDEX idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX idx_event_reminders_user_id ON event_reminders(user_id);

-- Enable RLS on event_reminders
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- Users can manage their own reminders
CREATE POLICY "Users can manage own reminders" ON event_reminders
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- EVENT UPDATES TABLE (for tracking changes)
-- =============================================
CREATE TABLE IF NOT EXISTS event_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('time_change', 'location_change', 'cancellation', 'info_update')),
  old_value TEXT,
  new_value TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_updates_event_id ON event_updates(event_id);
CREATE INDEX idx_event_updates_created_at ON event_updates(created_at DESC);

-- Enable RLS on event_updates
ALTER TABLE event_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can read event updates
CREATE POLICY "Event updates are publicly readable" ON event_updates
  FOR SELECT USING (true);

-- Only event creators can create updates
CREATE POLICY "Creators can create event updates" ON event_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to automatically move waitlist users when spots open up
CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_waitlist_user RECORD;
BEGIN
  -- If spots_available increased and there are waitlist users
  IF NEW.spots_available > OLD.spots_available AND NEW.spots_available > 0 THEN
    -- Get the first person from waitlist
    SELECT * INTO next_waitlist_user
    FROM event_attendees
    WHERE event_id = NEW.id 
      AND status = 'waitlist'
    ORDER BY waitlist_position ASC
    LIMIT 1;
    
    -- Promote them to going
    IF FOUND THEN
      UPDATE event_attendees
      SET status = 'going',
          waitlist_position = NULL,
          updated_at = NOW()
      WHERE id = next_waitlist_user.id;
      
      -- Update event to reflect the filled spot
      NEW.spots_available := NEW.spots_available - 1;
      
      -- Create notification for the promoted user
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        next_waitlist_user.user_id,
        'event_reminder',
        'You''re in!',
        'A spot opened up for an event you were waitlisted for.',
        jsonb_build_object('eventId', NEW.id, 'type', 'waitlist_promoted')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to promote from waitlist when spots open
DROP TRIGGER IF EXISTS promote_waitlist_trigger ON events;
CREATE TRIGGER promote_waitlist_trigger
  BEFORE UPDATE ON events
  FOR EACH ROW
  WHEN (OLD.spots_available IS DISTINCT FROM NEW.spots_available)
  EXECUTE FUNCTION promote_from_waitlist();

-- Function to reorder waitlist positions
CREATE OR REPLACE FUNCTION reorder_waitlist(p_event_id UUID)
RETURNS void AS $$
BEGIN
  WITH ordered_waitlist AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_position
    FROM event_attendees
    WHERE event_id = p_event_id AND status = 'waitlist'
  )
  UPDATE event_attendees
  SET waitlist_position = ordered_waitlist.new_position
  FROM ordered_waitlist
  WHERE event_attendees.id = ordered_waitlist.id;
END;
$$ LANGUAGE plpgsql;
