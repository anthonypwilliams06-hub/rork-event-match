-- =============================================
-- SIMPLIFIED SUPABASE RLS POLICIES THAT WORK
-- =============================================
-- Run this ENTIRE script in your Supabase SQL Editor

-- First, disable RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_safety DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payouts DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_safety ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS TABLE - Simple policies
-- =============================================
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "users_delete" ON users FOR DELETE USING (auth.uid()::text = id::text);

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (auth.uid()::text = user_id::text);

-- =============================================
-- EVENTS TABLE
-- =============================================
CREATE POLICY "events_select" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_update" ON events FOR UPDATE USING (auth.uid()::text = creator_id::text);
CREATE POLICY "events_delete" ON events FOR DELETE USING (auth.uid()::text = creator_id::text);

-- =============================================
-- FAVORITES TABLE
-- =============================================
CREATE POLICY "favorites_select" ON favorites FOR SELECT USING (true);
CREATE POLICY "favorites_insert" ON favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "favorites_delete" ON favorites FOR DELETE USING (auth.uid()::text = user_id::text);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE POLICY "messages_select" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text
);

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (true);
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (true);

-- =============================================
-- RATINGS TABLE
-- =============================================
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "ratings_update" ON ratings FOR UPDATE USING (auth.uid()::text = reviewer_id::text);
CREATE POLICY "ratings_delete" ON ratings FOR DELETE USING (auth.uid()::text = reviewer_id::text);

-- =============================================
-- BLOCKED_USERS TABLE
-- =============================================
CREATE POLICY "blocked_select" ON blocked_users FOR SELECT USING (auth.uid()::text = blocker_id::text);
CREATE POLICY "blocked_insert" ON blocked_users FOR INSERT WITH CHECK (true);
CREATE POLICY "blocked_delete" ON blocked_users FOR DELETE USING (auth.uid()::text = blocker_id::text);

-- =============================================
-- REPORTS TABLE
-- =============================================
CREATE POLICY "reports_select" ON reports FOR SELECT USING (auth.uid()::text = reporter_id::text);
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (true);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (auth.uid()::text = user_id::text);

-- =============================================
-- NOTIFICATION_SETTINGS TABLE
-- =============================================
CREATE POLICY "notif_settings_select" ON notification_settings FOR SELECT USING (true);
CREATE POLICY "notif_settings_insert" ON notification_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_settings_update" ON notification_settings FOR UPDATE USING (auth.uid()::text = user_id::text);

-- =============================================
-- EVENT_SAFETY TABLE
-- =============================================
CREATE POLICY "safety_select" ON event_safety FOR SELECT USING (true);
CREATE POLICY "safety_insert" ON event_safety FOR INSERT WITH CHECK (true);
CREATE POLICY "safety_update" ON event_safety FOR UPDATE USING (auth.uid()::text = user_id::text);

-- =============================================
-- EVENT_ATTENDEES TABLE
-- =============================================
CREATE POLICY "attendees_select" ON event_attendees FOR SELECT USING (true);
CREATE POLICY "attendees_insert" ON event_attendees FOR INSERT WITH CHECK (true);
CREATE POLICY "attendees_update" ON event_attendees FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "attendees_delete" ON event_attendees FOR DELETE USING (auth.uid()::text = user_id::text);

-- =============================================
-- VERIFICATION_REQUESTS TABLE
-- =============================================
CREATE POLICY "verification_select" ON verification_requests FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "verification_insert" ON verification_requests FOR INSERT WITH CHECK (true);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE POLICY "payments_select" ON payments FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (true);

-- =============================================
-- PAYOUTS TABLE
-- =============================================
CREATE POLICY "payouts_select" ON payouts FOR SELECT USING (auth.uid()::text = creator_id::text);
CREATE POLICY "payouts_insert" ON payouts FOR INSERT WITH CHECK (true);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON events TO anon, authenticated;
GRANT ALL ON favorites TO anon, authenticated;
GRANT ALL ON messages TO anon, authenticated;
GRANT ALL ON conversations TO anon, authenticated;
GRANT ALL ON ratings TO anon, authenticated;
GRANT ALL ON blocked_users TO anon, authenticated;
GRANT ALL ON reports TO anon, authenticated;
GRANT ALL ON notifications TO anon, authenticated;
GRANT ALL ON notification_settings TO anon, authenticated;
GRANT ALL ON event_safety TO anon, authenticated;
GRANT ALL ON event_attendees TO anon, authenticated;
GRANT ALL ON verification_requests TO anon, authenticated;
GRANT ALL ON payments TO anon, authenticated;
GRANT ALL ON payouts TO anon, authenticated;

-- =============================================
-- VERIFY POLICIES WERE CREATED
-- =============================================
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
