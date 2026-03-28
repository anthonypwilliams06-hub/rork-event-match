-- =============================================
-- SECURE SUPABASE RLS POLICIES - PRODUCTION READY
-- =============================================
-- Run this ENTIRE script in your Supabase SQL Editor

-- =============================================
-- STEP 1: CREATE USER AUTO-CREATION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
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

CREATE POLICY "users_public_read" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_delete_own" ON users
  FOR DELETE USING (auth.uid() = id);


-- =============================================
-- PROFILES TABLE POLICIES
-- =============================================

CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- EVENTS TABLE POLICIES
-- =============================================

CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (is_draft = false AND status != 'cancelled');

CREATE POLICY "events_creator_read_drafts" ON events
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "events_insert_as_creator" ON events
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "events_update_own" ON events
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "events_delete_own" ON events
  FOR DELETE USING (auth.uid() = creator_id);


-- =============================================
-- FAVORITES TABLE POLICIES
-- =============================================

CREATE POLICY "favorites_read_own" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- MESSAGES TABLE POLICIES
-- =============================================

CREATE POLICY "messages_read_participant" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert_as_sender" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_participant" ON messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);


-- =============================================
-- CONVERSATIONS TABLE POLICIES
-- =============================================

CREATE POLICY "conversations_read_participant" ON conversations
  FOR SELECT USING (auth.uid()::text = ANY(participant_ids));

CREATE POLICY "conversations_insert_participant" ON conversations
  FOR INSERT WITH CHECK (auth.uid()::text = ANY(participant_ids));

CREATE POLICY "conversations_update_participant" ON conversations
  FOR UPDATE USING (auth.uid()::text = ANY(participant_ids));


-- =============================================
-- RATINGS TABLE POLICIES
-- =============================================

CREATE POLICY "ratings_public_read" ON ratings
  FOR SELECT USING (true);

CREATE POLICY "ratings_insert_as_reviewer" ON ratings
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "ratings_update_own" ON ratings
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "ratings_delete_own" ON ratings
  FOR DELETE USING (auth.uid() = reviewer_id);


-- =============================================
-- BLOCKED USERS TABLE POLICIES
-- =============================================

CREATE POLICY "blocked_users_read_own" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "blocked_users_insert_as_blocker" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocked_users_delete_own" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);


-- =============================================
-- REPORTS TABLE POLICIES
-- =============================================

CREATE POLICY "reports_read_own" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "reports_insert_as_reporter" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);


-- =============================================
-- NOTIFICATIONS TABLE POLICIES
-- =============================================

CREATE POLICY "notifications_read_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_for_user" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- NOTIFICATION SETTINGS TABLE POLICIES
-- =============================================

CREATE POLICY "notification_settings_read_own" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notification_settings_insert_own" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_settings_update_own" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);


-- =============================================
-- EVENT SAFETY TABLE POLICIES
-- =============================================

CREATE POLICY "event_safety_read_own" ON event_safety
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "event_safety_insert_own" ON event_safety
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_safety_update_own" ON event_safety
  FOR UPDATE USING (auth.uid() = user_id);


-- =============================================
-- EVENT ATTENDEES TABLE POLICIES
-- =============================================

CREATE POLICY "event_attendees_public_read" ON event_attendees
  FOR SELECT USING (true);

CREATE POLICY "event_attendees_insert_own" ON event_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_attendees_update_own" ON event_attendees
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "event_attendees_delete_own" ON event_attendees
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- VERIFICATION REQUESTS TABLE POLICIES
-- =============================================

CREATE POLICY "verification_requests_read_own" ON verification_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "verification_requests_insert_own" ON verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- =============================================
-- PAYMENTS TABLE POLICIES
-- =============================================

CREATE POLICY "payments_read_own" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- =============================================
-- PAYOUTS TABLE POLICIES
-- =============================================

CREATE POLICY "payouts_read_own" ON payouts
  FOR SELECT USING (auth.uid() = creator_id);


-- =============================================
-- GRANT TABLE PERMISSIONS
-- =============================================

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

GRANT SELECT ON users TO anon;
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON events TO anon;
GRANT SELECT ON ratings TO anon;
GRANT SELECT ON event_attendees TO anon;


-- =============================================
-- VERIFY SETUP
-- =============================================

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