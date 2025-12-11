# Supabase Migration Guide

## Overview
Your app has been migrated from an in-memory database to **Supabase** - a powerful PostgreSQL database with built-in authentication, real-time subscriptions, and row-level security.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: Your app name
   - **Database Password**: Strong password (save this!)
   - **Region**: Choose closest to your users
5. Wait for project to be created (~2 minutes)

### 2. Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

### 3. Set Up Environment Variables

You need to provide two environment variables:

1. **EXPO_PUBLIC_SUPABASE_URL**: Your project URL (public, client-side)
2. **SUPABASE_SERVICE_ROLE_KEY**: Your service role key (private, server-side only)

The system will prompt you for these when you run the app.

### 4. Run the Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click "New Query"
4. Copy the entire contents of `supabase-schema.sql`
5. Paste into the editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for all tables to be created

You should see: "Success. No rows returned"

### 5. Enable Email Authentication

1. Go to **Authentication** → **Settings**
2. Under **Auth Providers**, enable:
   - **Email** (should be enabled by default)
3. Configure email templates if you want custom branding (optional)

### 6. Test Your Setup

1. Start your app
2. Try signing up with a new account
3. Check **Authentication** → **Users** in Supabase to see your user
4. Check **Table Editor** to see data being created

## What Changed?

### Authentication
- ✅ Now using **Supabase Auth** instead of custom sessions
- ✅ Secure JWT-based authentication
- ✅ Built-in password reset via email
- ✅ Session management handled automatically

### Database
- ✅ PostgreSQL instead of in-memory storage
- ✅ Data persists across app restarts
- ✅ Row Level Security (RLS) enabled
- ✅ Indexes for fast queries
- ✅ Foreign keys and constraints

### Real-time Capabilities (Future)
- 🚀 Can add real-time subscriptions for messages
- 🚀 Live updates when events change
- 🚀 Presence features

## Database Schema

Your database has these tables:

- **users** - User accounts
- **profiles** - User profiles (creator/seeker)
- **events** - Events created by users
- **favorites** - Saved/liked events
- **messages** - Direct messages
- **conversations** - Message threads
- **ratings** - Event reviews
- **blocked_users** - Blocked user list
- **reports** - User reports
- **notifications** - App notifications
- **notification_settings** - User notification preferences
- **event_safety** - Safety features for events
- **event_attendees** - Event RSVPs
- **verification_requests** - ID verification
- **payments** - Payment transactions
- **payouts** - Creator payouts

## Row Level Security (RLS)

Your database has security policies that:
- Users can only see/edit their own data
- Public data (profiles, events) is readable by all
- Messages are only visible to sender/receiver
- Admins can access all data

## Troubleshooting

### "The operation is insecure" Error
This usually means environment variables are not set. Make sure to provide:
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Users Can't Sign Up
1. Check if Email auth is enabled in Supabase
2. Check the browser console for errors
3. Verify your environment variables are correct

### Data Not Showing Up
1. Check the Table Editor in Supabase
2. Look for errors in the browser console
3. Check that RLS policies allow the operation

### Password Reset Not Working
1. Go to **Authentication** → **Email Templates**
2. Make sure "Confirm signup" and "Reset password" are configured
3. Check spam folder for test emails

## Next Steps

1. **Set up Storage** (for profile photos, event images)
   - Go to **Storage** in Supabase
   - Create buckets: `avatars`, `events`
   - Set up public access policies

2. **Add Real-time Features**
   - Enable real-time on messages table
   - Subscribe to changes in your React components

3. **Set up Edge Functions** (optional)
   - For complex server-side logic
   - Payment processing
   - Email notifications

4. **Monitor Usage**
   - Go to **Settings** → **Usage**
   - Watch for approaching limits
   - Upgrade plan if needed

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Your project logs: **Database** → **Logs**
