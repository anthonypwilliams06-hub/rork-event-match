-- =============================================
-- SECURE SUPABASE RLS POLICIES - PRODUCTION READY
-- =============================================
-- Run this ENTIRE script in your Supabase SQL Editor
-- This fixes the "Operation is Insecure" error while maintaining security

-- =============================================
-- STEP 1: CREATE USER AUTO-CREATION TRIGGER
-- =============================================
-- This solves the chicken-and-egg problem during signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Automatically create user record when someone signs up
  INSERT INTO public.users (id, email, name, date_of_birth, age)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NOW() - INTERVAL '18 years',
    18
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- STEP 2: CLEAN UP OLD POLICIES
-- =============================================
-- Remove all existing policies to start fresh

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;


-- =============================================
-- STEP 3: USERS TABLE POLICIES
-- =============================================
-- Public can read basic user info (needed for event creators, profiles)
CREATE POLICY "users_public_read" ON users
  FOR SELECT 
  USING (true);

-- Users can only update their own data
CREATE POLICY "users_update_own" ON users
  FOR UPDATE 
  USING (auth.uid() = id);

-- Users can only delete their own account
CREATE POLICY "users_delete_own" ON users
  FOR DELETE 
  USING (auth.uid() = id);

-- NO INSERT POLICY - the trigger handles user creation


-- =============================================
-- PROFILES TABLE POLICIES
-- =============================================
-- Anyone can view profiles (needed for matchmaking/browsing)
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT 
  USING (true);

-- Users can only insert their own profile
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can only delete their own profile
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE 
  USING (auth.uid() = user_id);


-- =============================================
-- EVENTS TABLE POLICIES
-- =============================================
-- Anyone can view non-draft, non-cancelled events
CREATE POLICY "events_public_read" ON events
  FOR SELECT 
  USING (is_draft = false AND status != 'cancelled');

-- Creators can view their own draft events
CREATE POLICY "events_creator_read_drafts" ON events
  FOR SELECT 
  USING (auth.uid() = creator_id);

-- Only authenticated users can create events as themselves
CREATE POLICY "events_insert_as_creator" ON events
  FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

-- Only event creators can update their own events
CREATE POLICY "events_update_own" ON events
  FOR UPDATE 
  USING (auth.uid() = creator_id);

-- Only event creators can delete their own events
CREATE POLICY "events_delete_own" ON events
  FOR DELETE 
  USING (auth.uid() = creator_id);


-- =============================================
-- FAVORITES TABLE POLICIES
-- =============================================
-- Users can only see their own favorites
CREATE POLICY "favorites_read_own" ON favorites
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can only add favorites for themselves
CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own favorites
CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE 
  USING (auth.uid() = user_id);


-- =============================================
-- MESSAGES TABLE POLICIES
-- =============================================
-- Users can only read messages they sent or received
CREATE POLICY "messages_read_participant" ON messages
  FOR SELECT 
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

-- Users can only send messages as themselves
CREATE POLICY "messages_insert_as_sender" ON messages
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they're part of (mark as read)
CREATE POLICY "messages_update_participant" ON messages
  FOR UPDATE 
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );


-- =============================================
-- CONVERSATIONS TABLE POLICIES
-- =============================================
-- Users can only see conversations they're part of
CREATE POLICY "conversations_read_participant" ON conversations
  FOR SELECT 
  USING (auth.uid()::text = ANY(participant_ids));

-- Users can create conversations they're part of
CREATE POLICY "conversations_insert_participant" ON conversations
  FOR INSERT 
  WITH CHECK (auth.uid()::text = ANY(participant_ids));

-- Users can update conversations they're part of
CREATE POLICY "conversations_update_participant" ON conversations
  FOR UPDATE 
  USING (auth.uid()::text = ANY(participant_ids));


-- =============================================
-- RATINGS TABLE POLICIES
-- =============================================
-- Anyone can read ratings (public reviews)
CREATE POLICY "ratings_public_read" ON ratings
  FOR SELECT 
  USING (true);

-- Users can only create ratings as themselves
CREATE POLICY "ratings_insert_as_reviewer" ON ratings
  FOR INSERT 
  WITH CHECK (auth.uid() = reviewer_id);

-- Users can only update their own ratings
CREATE POLICY "ratings_update_own" ON ratings
  FOR UPDATE 
  USING (auth.uid() = reviewer_id);

-- Users can only delete their own ratings
CREATE POLICY "ratings_delete_own" ON ratings
  FOR DELETE 
  USING (auth.uid() = reviewer_id);


-- =============================================
-- BLOCKED USERS TABLE POLICIES
-- =============================================
-- Users can only see who they've blocked
CREATE POLICY "blocked_users_read_own" ON blocked_users
  FOR SELECT 
  USING (auth.uid() = blocker_id);

-- Users can only block others as themselves
CREATE POLICY "blocked_users_insert_as_blocker" ON blocked_users
  FOR INSERT 
  WITH CHECK (auth.uid() = blocker_id);

-- Users can only unblock their own blocks
CREATE POLICY "blocked_users_delete_own" ON blocked_users
  FOR DELETE 
  USING (auth.uid() = blocker_id);


-- =============================================
-- REPORTS TABLE POLICIES
-- =============================================
-- Users can only see their own reports
CREATE POLICY "reports_read_own" ON reports
  FOR SELECT 
  USING (auth.uid() = reporter_id);

-- Users can only create reports as themselves
CREATE POLICY "reports_insert_as_reporter" ON reports
  FOR INSERT 
  WITH CHECK (auth.uid() = reporter_id);


-- =============================================
-- NOTIFICATIONS TABLE POLICIES
-- =============================================
-- Users can only see their own notifications
CREATE POLICY "notifications_read_own" ON notifications
  FOR SELECT 
  USING (auth.uid() = user_id);

-- System can create notifications (via service role or trigger)
CREATE POLICY "notifications_insert_for_user" ON notifications
  FOR INSERT 
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE 
  USING (auth.uid() = user_id);


-- =============================================
-- NOTIFICATION SETTINGS TABLE POLICIES
-- =============================================
-- Users can only see their own settings
CREATE POLICY "notification_settings_read_own" ON notification_settings
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can only create their own settings
CREATE POLICY "notification_settings_insert_own" ON notification_settings
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own settings
CREATE POLICY "notification_settings_update_own" ON notification_settings
  FOR UPDATE 
  USING (auth.uid() = user_id);


-- =============================================
-- EVENT SAFETY TABLE POLICIES
-- =============================================
-- Users can only see their own safety records
CREATE POLICY "event_safety_read_own" ON event_safety
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can only create safety records for themselves
CREATE POLICY "event_safety_insert_own" ON event_safety
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own safety records
CREATE POLICY "event_safety_update_own" ON event_safety
  FOR UPDATE 
  USING (auth.uid() = user_id);


-- =============================================
-- EVENT ATTENDEES TABLE POLICIES
-- =============================================
-- Anyone can see who's attending events (public)
CREATE POLICY "event_attendees_public_read" ON event_attendees
  FOR SELECT 
  USING (true);

-- Users can only RSVP as themselves
CREATE POLICY "event_attendees_insert_own" ON event_attendees
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own attendance
CREATE POLICY "event_attendees_update_own" ON event_attendees
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can only remove their own attendance
CREATE POLICY "event_attendees_delete_own" ON event_attendees
  FOR DELETE 
  USING (auth.uid() = user_id);


-- =============================================
-- VERIFICATION REQUESTS TABLE POLICIES
-- =============================================
-- Users can only see their own verification requests
CREATE POLICY "verification_requests_read_own" ON verification_requests
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can only create verification requests for themselves
CREATE POLICY "verification_requests_insert_own" ON verification_requests
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- PAYMENTS TABLE POLICIES
-- =============================================
-- Users can only see their own payments
CREATE POLICY "payments_read_own" ON payments
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can only create payments for themselves
CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- PAYOUTS TABLE POLICIES
-- =============================================
-- Creators can only see their own payouts
CREATE POLICY "payouts_read_own" ON payouts
  FOR SELECT 
  USING (auth.uid() = creator_id);

-- System creates payouts (via service role)
-- No user INSERT policy needed


-- =============================================
-- GRANT TABLE PERMISSIONS
-- =============================================
-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;
GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ratings TO authenticated;
GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;
GRANT SELECT, INSERT ON reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON event_safety TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_attendees TO authenticated;
GRANT SELECT, INSERT ON verification_requests TO authenticated;
GRANT SELECT, INSERT ON payments TO authenticated;
GRANT SELECT ON payouts TO authenticated;

-- Grant read-only access to anon users for public data
GRANT SELECT ON users TO anon;
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON events TO anon;
GRANT SELECT ON ratings TO anon;
GRANT SELECT ON event_attendees TO anon;


-- =============================================
-- VERIFY SETUP
-- =============================================
-- Run this query to verify all policies are in place:
SELECT 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN roles = '{authenticated}' THEN 'authenticated'
    WHEN roles = '{anon}' THEN 'anon'
    ELSE roles::text
  END as applies_to
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
