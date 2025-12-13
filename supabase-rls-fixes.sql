-- =============================================
-- SUPABASE RLS POLICY FIXES
-- =============================================
-- Run this in your Supabase SQL Editor to fix insecure operation errors
-- This adds missing INSERT, UPDATE, DELETE policies for all tables

-- =============================================
-- USERS TABLE POLICIES
-- =============================================
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Public user info readable" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Allow service role full access to users" ON users;
DROP POLICY IF EXISTS "Allow authenticated insert to users" ON users;

-- Allow anyone to read basic user info (needed for event creators, messaging)
CREATE POLICY "Public user info readable" ON users
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own user record
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = id OR auth.uid()::text = id::text)
  );

-- Allow users to update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = id OR auth.uid()::text = id::text)
  );

-- Allow users to delete their own account
CREATE POLICY "Users can delete own data" ON users
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = id OR auth.uid()::text = id::text)
  );

-- Service role bypass (for backend operations)
CREATE POLICY "Service role full access users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- PROFILES TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON profiles;

-- Anyone can read profiles (for matchmaking/browsing)
CREATE POLICY "Profiles are publicly readable" ON profiles
  FOR SELECT USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Service role bypass
CREATE POLICY "Service role full access profiles" ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- EVENTS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Events are publicly readable" ON events;
DROP POLICY IF EXISTS "Creators can manage own events" ON events;
DROP POLICY IF EXISTS "Allow anonymous event viewing" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Service role full access events" ON events;

-- Anyone can read non-draft, non-cancelled events
CREATE POLICY "Events are publicly readable" ON events
  FOR SELECT USING (is_draft = FALSE OR creator_id = auth.uid());

-- Authenticated users can create events
CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = creator_id OR auth.uid()::text = creator_id::text)
  );

-- Creators can update their own events
CREATE POLICY "Creators can update own events" ON events
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = creator_id OR auth.uid()::text = creator_id::text)
  );

-- Creators can delete their own events
CREATE POLICY "Creators can delete own events" ON events
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = creator_id OR auth.uid()::text = creator_id::text)
  );

-- Service role bypass
CREATE POLICY "Service role full access events" ON events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- FAVORITES TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can read own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can insert favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete favorites" ON favorites;
DROP POLICY IF EXISTS "Service role full access favorites" ON favorites;

-- Users can read their own favorites
CREATE POLICY "Users can read own favorites" ON favorites
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can add favorites
CREATE POLICY "Users can insert favorites" ON favorites
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can remove favorites
CREATE POLICY "Users can delete favorites" ON favorites
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Service role bypass
CREATE POLICY "Service role full access favorites" ON favorites
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- MESSAGES TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Service role full access messages" ON messages;

-- Users can read messages they sent or received
CREATE POLICY "Users can read own messages" ON messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      auth.uid() = sender_id OR 
      auth.uid()::text = sender_id::text OR
      auth.uid() = receiver_id OR 
      auth.uid()::text = receiver_id::text
    )
  );

-- Users can send messages
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = sender_id OR auth.uid()::text = sender_id::text)
  );

-- Users can update their own sent messages (mark as read)
CREATE POLICY "Users can update messages" ON messages
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      auth.uid() = sender_id OR 
      auth.uid()::text = sender_id::text OR
      auth.uid() = receiver_id OR 
      auth.uid()::text = receiver_id::text
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access messages" ON messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- CONVERSATIONS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON conversations;
DROP POLICY IF EXISTS "Service role full access conversations" ON conversations;

-- Users can read conversations they're part of
CREATE POLICY "Users can read own conversations" ON conversations
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid()::text = ANY(participant_ids))
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid()::text = ANY(participant_ids))
  );

-- Users can update conversations they're part of
CREATE POLICY "Users can update conversations" ON conversations
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid()::text = ANY(participant_ids))
  );

-- Service role bypass
CREATE POLICY "Service role full access conversations" ON conversations
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- RATINGS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Ratings are publicly readable" ON ratings;
DROP POLICY IF EXISTS "Users can create ratings" ON ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON ratings;
DROP POLICY IF EXISTS "Service role full access ratings" ON ratings;

-- Anyone can read ratings
CREATE POLICY "Ratings are publicly readable" ON ratings
  FOR SELECT USING (true);

-- Authenticated users can create ratings
CREATE POLICY "Users can create ratings" ON ratings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = reviewer_id OR auth.uid()::text = reviewer_id::text)
  );

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings" ON ratings
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = reviewer_id OR auth.uid()::text = reviewer_id::text)
  );

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings" ON ratings
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = reviewer_id OR auth.uid()::text = reviewer_id::text)
  );

-- Service role bypass
CREATE POLICY "Service role full access ratings" ON ratings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- BLOCKED_USERS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can read own blocked" ON blocked_users;
DROP POLICY IF EXISTS "Users can block others" ON blocked_users;
DROP POLICY IF EXISTS "Users can unblock" ON blocked_users;
DROP POLICY IF EXISTS "Service role full access blocked_users" ON blocked_users;

-- Users can see who they've blocked
CREATE POLICY "Users can read own blocked" ON blocked_users
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = blocker_id OR auth.uid()::text = blocker_id::text)
  );

-- Users can block others
CREATE POLICY "Users can block others" ON blocked_users
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = blocker_id OR auth.uid()::text = blocker_id::text)
  );

-- Users can unblock
CREATE POLICY "Users can unblock" ON blocked_users
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = blocker_id OR auth.uid()::text = blocker_id::text)
  );

-- Service role bypass
CREATE POLICY "Service role full access blocked_users" ON blocked_users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- REPORTS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can read own reports" ON reports;
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Service role full access reports" ON reports;

-- Users can see their own reports
CREATE POLICY "Users can read own reports" ON reports
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = reporter_id OR auth.uid()::text = reporter_id::text)
  );

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = reporter_id OR auth.uid()::text = reporter_id::text)
  );

-- Service role bypass (for admin review)
CREATE POLICY "Service role full access reports" ON reports
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- NOTIFICATIONS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role full access notifications" ON notifications;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Service role bypass (for sending notifications)
CREATE POLICY "Service role full access notifications" ON notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- NOTIFICATION_SETTINGS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can read own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can manage notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Service role full access notification_settings" ON notification_settings;

-- Users can read their own settings
CREATE POLICY "Users can read own notification settings" ON notification_settings
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can insert their settings
CREATE POLICY "Users can insert notification settings" ON notification_settings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can update their settings
CREATE POLICY "Users can update notification settings" ON notification_settings
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Service role bypass
CREATE POLICY "Service role full access notification_settings" ON notification_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- EVENT_SAFETY TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can read own safety records" ON event_safety;
DROP POLICY IF EXISTS "Users can create safety records" ON event_safety;
DROP POLICY IF EXISTS "Users can update own safety records" ON event_safety;
DROP POLICY IF EXISTS "Service role full access event_safety" ON event_safety;

-- Users can read their own safety records
CREATE POLICY "Users can read own safety records" ON event_safety
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can create safety records
CREATE POLICY "Users can create safety records" ON event_safety
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can update their own safety records
CREATE POLICY "Users can update own safety records" ON event_safety
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Service role bypass
CREATE POLICY "Service role full access event_safety" ON event_safety
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- EVENT_ATTENDEES TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Attendees are publicly readable" ON event_attendees;
DROP POLICY IF EXISTS "Users can join events" ON event_attendees;
DROP POLICY IF EXISTS "Users can update own attendance" ON event_attendees;
DROP POLICY IF EXISTS "Users can leave events" ON event_attendees;
DROP POLICY IF EXISTS "Service role full access event_attendees" ON event_attendees;

-- Anyone can see event attendees
CREATE POLICY "Attendees are publicly readable" ON event_attendees
  FOR SELECT USING (true);

-- Users can join events
CREATE POLICY "Users can join events" ON event_attendees
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can update their own attendance
CREATE POLICY "Users can update own attendance" ON event_attendees
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can leave events
CREATE POLICY "Users can leave events" ON event_attendees
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Service role bypass
CREATE POLICY "Service role full access event_attendees" ON event_attendees
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- VERIFICATION_REQUESTS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can read own verification" ON verification_requests;
DROP POLICY IF EXISTS "Users can create verification request" ON verification_requests;
DROP POLICY IF EXISTS "Service role full access verification_requests" ON verification_requests;

-- Users can read their own verification requests
CREATE POLICY "Users can read own verification" ON verification_requests
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can create verification requests
CREATE POLICY "Users can create verification request" ON verification_requests
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Service role bypass (for admin review)
CREATE POLICY "Service role full access verification_requests" ON verification_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- PAYMENTS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can read own payments" ON payments;
DROP POLICY IF EXISTS "Users can create payments" ON payments;
DROP POLICY IF EXISTS "Service role full access payments" ON payments;

-- Users can read their own payments
CREATE POLICY "Users can read own payments" ON payments
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Users can create payments
CREATE POLICY "Users can create payments" ON payments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR auth.uid()::text = user_id::text)
  );

-- Service role bypass
CREATE POLICY "Service role full access payments" ON payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- PAYOUTS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Creators can read own payouts" ON payouts;
DROP POLICY IF EXISTS "Service role full access payouts" ON payouts;

-- Creators can read their own payouts
CREATE POLICY "Creators can read own payouts" ON payouts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = creator_id OR auth.uid()::text = creator_id::text)
  );

-- Service role bypass (payouts are created by system)
CREATE POLICY "Service role full access payouts" ON payouts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =============================================
-- These ensure authenticated users have the base permissions needed

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;
GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ratings TO authenticated;
GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;
GRANT SELECT, INSERT ON reports TO authenticated;
GRANT SELECT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON event_safety TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_attendees TO authenticated;
GRANT SELECT, INSERT ON verification_requests TO authenticated;
GRANT SELECT, INSERT ON payments TO authenticated;
GRANT SELECT ON payouts TO authenticated;

-- Grant read access to anon users for public data
GRANT SELECT ON users TO anon;
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON events TO anon;
GRANT SELECT ON ratings TO anon;
GRANT SELECT ON event_attendees TO anon;

-- =============================================
-- VERIFICATION COMPLETE
-- =============================================
-- Run this query to verify all policies are in place:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
