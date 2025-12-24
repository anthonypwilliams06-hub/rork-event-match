-- Add dealbreakers column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dealbreakers TEXT[] DEFAULT '{}';

-- Add rsvp_status column to event_attendees table
ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS rsvp_status TEXT CHECK (rsvp_status IN ('going', 'interested', 'not_going'));

-- Add reminder_sent column to event_attendees table for tracking reminders
ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for reminder queries
CREATE INDEX IF NOT EXISTS idx_event_attendees_reminder ON event_attendees(event_id, reminder_sent) WHERE rsvp_status IN ('going', 'interested');
