import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserProfile, Event, FavoriteEvent, Message, Conversation, Rating, BlockedUser, MutedUser, Report, Notification, NotificationSettings, EventSafetyInfo, EventAttendee, VerificationRequest, Payment, Payout, EventReminder, EventUpdate } from '@/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isBackendConfigured = Boolean(supabaseUrl && supabaseServiceKey);

if (!isBackendConfigured) {
  console.warn('⚠️  Supabase URL or Service Role Key is missing. Backend will not function properly.');
}

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!isBackendConfigured) {
    throw new Error('Supabase backend is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return supabaseAdmin;
}

export const serverAuth = {
  async signUp(email: string, password: string) {
    const client = getSupabaseAdmin();
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    
    if (error) {
      console.error('[ServerAuth] SignUp error:', error);
      throw new Error(error.message);
    }
    
    return { user: data.user };
  },
  
  async signIn(email: string, password: string) {
    const client = getSupabaseAdmin();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('[ServerAuth] SignIn error:', error);
      throw new Error(error.message);
    }
    
    return { user: data.user, session: data.session };
  },
  
  async signOut(accessToken?: string) {
    const client = getSupabaseAdmin();
    if (accessToken) {
      const { error } = await client.auth.admin.signOut(accessToken);
      if (error) {
        console.error('[ServerAuth] SignOut error:', error);
      }
    }
    return { success: true };
  },
  
  async resetPasswordRequest(email: string) {
    const client = getSupabaseAdmin();
    const { error } = await client.auth.resetPasswordForEmail(email);
    
    if (error) {
      console.error('[ServerAuth] Reset password error:', error);
      throw new Error(error.message);
    }
    
    return { success: true };
  },
};

export class SupabaseDB {
  private getClient(): SupabaseClient {
    return getSupabaseAdmin();
  }

  async createUser(user: Omit<User, 'createdAt'> & { passwordHash?: string }): Promise<User> {
    const { data, error } = await this.getClient()
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.name,
        date_of_birth: user.dateOfBirth,
        age: user.age,
        push_token: user.pushToken,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return this.mapUserFromDB(data);
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.getClient()
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get user: ${error.message}`);
    }
    return this.mapUserFromDB(data);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get user by email: ${error.message}`);
    }
    return this.mapUserFromDB(data);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.age) dbUpdates.age = updates.age;
    if (updates.pushToken) dbUpdates.push_token = updates.pushToken;
    if (updates.dateOfBirth) dbUpdates.date_of_birth = updates.dateOfBirth;

    const { data, error } = await this.getClient()
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return this.mapUserFromDB(data);
  }

  async createProfile(profile: UserProfile): Promise<UserProfile> {
    const { data, error } = await this.getClient()
      .from('profiles')
      .insert({
        user_id: profile.userId,
        role: profile.role,
        bio: profile.bio,
        photo_url: profile.photoUrl,
        interests: profile.interests,
        personality_traits: profile.personalityTraits,
        relationship_goal: profile.relationshipGoal,
        location: profile.location,
        age_range_min: profile.ageRangeMin,
        age_range_max: profile.ageRangeMax,
        verification_status: profile.verificationStatus || 'unverified',
        verification_photo: profile.verificationPhoto,
        premium_tier: profile.premiumTier || 'free',
        premium_expires_at: profile.premiumExpiresAt,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create profile: ${error.message}`);
    return this.mapProfileFromDB(data);
  }

  async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.getClient()
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get profile: ${error.message}`);
    }
    return this.mapProfileFromDB(data);
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
    if (updates.interests !== undefined) dbUpdates.interests = updates.interests;
    if (updates.personalityTraits !== undefined) dbUpdates.personality_traits = updates.personalityTraits;
    if (updates.dealbreakers !== undefined) dbUpdates.dealbreakers = updates.dealbreakers;
    if (updates.relationshipGoal !== undefined) dbUpdates.relationship_goal = updates.relationshipGoal;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.ageRangeMin !== undefined) dbUpdates.age_range_min = updates.ageRangeMin;
    if (updates.ageRangeMax !== undefined) dbUpdates.age_range_max = updates.ageRangeMax;
    if (updates.verificationStatus !== undefined) dbUpdates.verification_status = updates.verificationStatus;
    if (updates.verificationPhoto !== undefined) dbUpdates.verification_photo = updates.verificationPhoto;
    if (updates.premiumTier !== undefined) dbUpdates.premium_tier = updates.premiumTier;
    if (updates.premiumExpiresAt !== undefined) dbUpdates.premium_expires_at = updates.premiumExpiresAt;

    const { data, error } = await this.getClient()
      .from('profiles')
      .update(dbUpdates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return this.mapProfileFromDB(data);
  }

  async createEvent(event: Event): Promise<Event> {
    const { data, error } = await this.getClient()
      .from('events')
      .insert({
        id: event.id,
        creator_id: event.creatorId,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        latitude: event.latitude,
        longitude: event.longitude,
        category: event.category,
        vibes: event.vibes,
        image_url: event.imageUrl,
        capacity: event.capacity,
        spots_available: event.spotsAvailable,
        attendee_ids: event.attendeeIds,
        status: event.status,
        is_draft: event.isDraft,
        is_paid: event.isPaid,
        price: event.price,
        currency: event.currency,
        views: event.views,
        likes: event.likes,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create event: ${error.message}`);
    return this.mapEventFromDB(data);
  }

  async getEventById(id: string): Promise<Event | null> {
    const { data, error } = await this.getClient()
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get event: ${error.message}`);
    }
    return this.mapEventFromDB(data);
  }

  async getEventsByCreatorId(creatorId: string): Promise<Event[]> {
    const { data, error } = await this.getClient()
      .from('events')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get events by creator: ${error.message}`);
    return data.map(event => this.mapEventFromDB(event));
  }

  async getAllEvents(): Promise<Event[]> {
    const { data, error } = await this.getClient()
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get all events: ${error.message}`);
    return data.map(event => this.mapEventFromDB(event));
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.vibes !== undefined) dbUpdates.vibes = updates.vibes;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
    if (updates.spotsAvailable !== undefined) dbUpdates.spots_available = updates.spotsAvailable;
    if (updates.attendeeIds !== undefined) dbUpdates.attendee_ids = updates.attendeeIds;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.isDraft !== undefined) dbUpdates.is_draft = updates.isDraft;
    if (updates.isPaid !== undefined) dbUpdates.is_paid = updates.isPaid;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.views !== undefined) dbUpdates.views = updates.views;
    if (updates.likes !== undefined) dbUpdates.likes = updates.likes;

    const { data, error } = await this.getClient()
      .from('events')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update event: ${error.message}`);
    return this.mapEventFromDB(data);
  }

  async deleteEvent(id: string): Promise<boolean> {
    const { error } = await this.getClient()
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete event: ${error.message}`);
    return true;
  }

  async createFavorite(favorite: FavoriteEvent): Promise<FavoriteEvent> {
    const { data, error } = await this.getClient()
      .from('favorites')
      .insert({
        id: favorite.id,
        user_id: favorite.userId,
        event_id: favorite.eventId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create favorite: ${error.message}`);
    return this.mapFavoriteFromDB(data);
  }

  async getFavoriteById(id: string): Promise<FavoriteEvent | null> {
    const { data, error } = await this.getClient()
      .from('favorites')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get favorite: ${error.message}`);
    }
    return this.mapFavoriteFromDB(data);
  }

  async getFavoriteByUserAndEvent(userId: string, eventId: string): Promise<FavoriteEvent | null> {
    const { data, error } = await this.getClient()
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get favorite by user and event: ${error.message}`);
    }
    return this.mapFavoriteFromDB(data);
  }

  async getFavoritesByUserId(userId: string): Promise<FavoriteEvent[]> {
    const { data, error } = await this.getClient()
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get favorites by user: ${error.message}`);
    return data.map(fav => this.mapFavoriteFromDB(fav));
  }

  async deleteFavorite(id: string): Promise<boolean> {
    const { error } = await this.getClient()
      .from('favorites')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete favorite: ${error.message}`);
    return true;
  }

  async createMessage(message: Message): Promise<Message> {
    const { data, error } = await this.getClient()
      .from('messages')
      .insert({
        id: message.id,
        sender_id: message.senderId,
        receiver_id: message.receiverId,
        content: message.content,
        read: message.read,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create message: ${error.message}`);
    return this.mapMessageFromDB(data);
  }

  async getMessageById(id: string): Promise<Message | null> {
    const { data, error } = await this.getClient()
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get message: ${error.message}`);
    }
    return this.mapMessageFromDB(data);
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<Message[]> {
    const { data, error } = await this.getClient()
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to get messages between users: ${error.message}`);
    return data.map(msg => this.mapMessageFromDB(msg));
  }

  async markMessageAsRead(id: string): Promise<Message | null> {
    const { data, error } = await this.getClient()
      .from('messages')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to mark message as read: ${error.message}`);
    return this.mapMessageFromDB(data);
  }

  async createOrUpdateConversation(conversation: Conversation): Promise<Conversation> {
    const sortedIds = [...conversation.participantIds].sort();
    const { data: existing } = await this.getClient()
      .from('conversations')
      .select('*')
      .contains('participant_ids', sortedIds)
      .single();

    if (existing) {
      const { data, error } = await this.getClient()
        .from('conversations')
        .update({
          last_message_id: conversation.lastMessage?.id,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update conversation: ${error.message}`);
      return this.mapConversationFromDB(data);
    }

    const { data, error } = await this.getClient()
      .from('conversations')
      .insert({
        id: conversation.id,
        participant_ids: sortedIds,
        last_message_id: conversation.lastMessage?.id,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    return this.mapConversationFromDB(data);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    const { data, error } = await this.getClient()
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
    return this.mapConversationFromDB(data);
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    const { data, error } = await this.getClient()
      .from('conversations')
      .select('*')
      .contains('participant_ids', [userId])
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to get conversations by user: ${error.message}`);
    return data.map(conv => this.mapConversationFromDB(conv));
  }

  async createRating(rating: Rating): Promise<Rating> {
    const { data, error } = await this.getClient()
      .from('ratings')
      .insert({
        id: rating.id,
        event_id: rating.eventId,
        reviewer_id: rating.reviewerId,
        creator_id: rating.creatorId,
        rating: rating.rating,
        review: rating.review,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create rating: ${error.message}`);
    return this.mapRatingFromDB(data);
  }

  async getRatingById(id: string): Promise<Rating | null> {
    const { data, error } = await this.getClient()
      .from('ratings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get rating: ${error.message}`);
    }
    return this.mapRatingFromDB(data);
  }

  async getRatingsByCreatorId(creatorId: string): Promise<Rating[]> {
    const { data, error } = await this.getClient()
      .from('ratings')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get ratings by creator: ${error.message}`);
    return data.map(rating => this.mapRatingFromDB(rating));
  }

  async getRatingByEventAndReviewer(eventId: string, reviewerId: string): Promise<Rating | null> {
    const { data, error } = await this.getClient()
      .from('ratings')
      .select('*')
      .eq('event_id', eventId)
      .eq('reviewer_id', reviewerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get rating by event and reviewer: ${error.message}`);
    }
    return this.mapRatingFromDB(data);
  }

  async updateRating(id: string, updates: Partial<Rating>): Promise<Rating | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.review !== undefined) dbUpdates.review = updates.review;

    const { data, error } = await this.getClient()
      .from('ratings')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update rating: ${error.message}`);
    return this.mapRatingFromDB(data);
  }

  async createBlockedUser(blockedUser: BlockedUser): Promise<BlockedUser> {
    const { data, error } = await this.getClient()
      .from('blocked_users')
      .insert({
        id: blockedUser.id,
        blocker_id: blockedUser.blockerId,
        blocked_id: blockedUser.blockedId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to block user: ${error.message}`);
    return this.mapBlockedUserFromDB(data);
  }

  async getBlockedUser(blockerId: string, blockedId: string): Promise<BlockedUser | null> {
    const { data, error } = await this.getClient()
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get blocked user: ${error.message}`);
    }
    return this.mapBlockedUserFromDB(data);
  }

  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    const { data, error } = await this.getClient()
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', blockerId);

    if (error) {
      console.error('Failed to get blocked user IDs:', error);
      return [];
    }
    return data.map(row => row.blocked_id);
  }

  async getBlockedUsersByBlockerId(blockerId: string): Promise<BlockedUser[]> {
    const { data, error } = await this.getClient()
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', blockerId);

    if (error) throw new Error(`Failed to get blocked users: ${error.message}`);
    return data.map(bu => this.mapBlockedUserFromDB(bu));
  }

  async deleteBlockedUser(id: string): Promise<boolean> {
    const { error } = await this.getClient()
      .from('blocked_users')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to unblock user: ${error.message}`);
    return true;
  }

  async createMutedUser(mutedUser: MutedUser): Promise<MutedUser> {
    const { data, error } = await this.getClient()
      .from('muted_users')
      .insert({
        id: mutedUser.id,
        muter_id: mutedUser.muterId,
        muted_id: mutedUser.mutedId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to mute user: ${error.message}`);
    return this.mapMutedUserFromDB(data);
  }

  async getMutedUser(muterId: string, mutedId: string): Promise<MutedUser | null> {
    const { data, error } = await this.getClient()
      .from('muted_users')
      .select('*')
      .eq('muter_id', muterId)
      .eq('muted_id', mutedId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get muted user: ${error.message}`);
    }
    return this.mapMutedUserFromDB(data);
  }

  async getMutedUserIds(muterId: string): Promise<string[]> {
    const { data, error } = await this.getClient()
      .from('muted_users')
      .select('muted_id')
      .eq('muter_id', muterId);

    if (error) {
      console.error('Failed to get muted user IDs:', error);
      return [];
    }
    return data.map(row => row.muted_id);
  }

  async deleteMutedUser(id: string): Promise<boolean> {
    const { error } = await this.getClient()
      .from('muted_users')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to unmute user: ${error.message}`);
    return true;
  }

  async getSharedEvents(userId1: string, userId2: string): Promise<(Event & { attendees: EventAttendee[] })[]> {
    const { data: user1Events, error: error1 } = await this.getClient()
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId1);

    if (error1) throw new Error(`Failed to get user events: ${error1.message}`);

    const { data: user2Events, error: error2 } = await this.getClient()
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId2);

    if (error2) throw new Error(`Failed to get user events: ${error2.message}`);

    const user1EventIds = user1Events.map(e => e.event_id);
    const user2EventIds = user2Events.map(e => e.event_id);
    const sharedEventIds = user1EventIds.filter(id => user2EventIds.includes(id));

    if (sharedEventIds.length === 0) return [];

    const events = await Promise.all(
      sharedEventIds.map(async (eventId) => {
        const event = await this.getEventById(eventId);
        const attendees = await this.getEventAttendees(eventId);
        return event ? { ...event, attendees } : null;
      })
    );

    return events.filter((e): e is Event & { attendees: EventAttendee[] } => e !== null);
  }

  private mapMutedUserFromDB(data: Record<string, unknown>): MutedUser {
    return {
      id: data.id as string,
      muterId: data.muter_id as string,
      mutedId: data.muted_id as string,
      createdAt: new Date(data.created_at as string),
    };
  }

  async createReport(report: Report): Promise<Report> {
    const { data, error } = await this.getClient()
      .from('reports')
      .insert({
        id: report.id,
        reporter_id: report.reporterId,
        reported_id: report.reportedId,
        reason: report.reason,
        description: report.description,
        status: report.status,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create report: ${error.message}`);
    return this.mapReportFromDB(data);
  }

  async getReportById(id: string): Promise<Report | null> {
    const { data, error } = await this.getClient()
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get report: ${error.message}`);
    }
    return this.mapReportFromDB(data);
  }

  async getAllReports(): Promise<Report[]> {
    const { data, error } = await this.getClient()
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get all reports: ${error.message}`);
    return data.map(report => this.mapReportFromDB(report));
  }

  async createNotification(notification: Notification): Promise<Notification> {
    const { data, error } = await this.getClient()
      .from('notifications')
      .insert({
        id: notification.id,
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        read: notification.read,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create notification: ${error.message}`);
    return this.mapNotificationFromDB(data);
  }

  async getNotificationById(id: string): Promise<Notification | null> {
    const { data, error } = await this.getClient()
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get notification: ${error.message}`);
    }
    return this.mapNotificationFromDB(data);
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    const { data, error } = await this.getClient()
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get notifications: ${error.message}`);
    return data.map(notif => this.mapNotificationFromDB(notif));
  }

  async markNotificationAsRead(id: string): Promise<Notification | null> {
    const { data, error } = await this.getClient()
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to mark notification as read: ${error.message}`);
    return this.mapNotificationFromDB(data);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await this.getClient()
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }

  async deleteNotification(id: string): Promise<boolean> {
    const { error } = await this.getClient()
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete notification: ${error.message}`);
    return true;
  }

  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    const { data, error } = await this.getClient()
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get notification settings: ${error.message}`);
    }
    return this.mapNotificationSettingsFromDB(data);
  }

  async createOrUpdateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    const { data, error } = await this.getClient()
      .from('notification_settings')
      .upsert({
        user_id: settings.userId,
        new_messages: settings.newMessages,
        profile_likes: settings.profileLikes,
        event_reminders: settings.eventReminders,
        message_replies: settings.messageReplies,
        event_filling_up: settings.eventFillingUp,
        push_enabled: settings.pushEnabled,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create/update notification settings: ${error.message}`);
    return this.mapNotificationSettingsFromDB(data);
  }

  async createEventSafetyInfo(safetyInfo: EventSafetyInfo): Promise<EventSafetyInfo> {
    const { data, error } = await this.getClient()
      .from('event_safety')
      .insert({
        id: safetyInfo.id,
        event_id: safetyInfo.eventId,
        user_id: safetyInfo.userId,
        trusted_contacts: safetyInfo.trustedContacts,
        check_in_time: safetyInfo.checkInTime,
        check_out_time: safetyInfo.checkOutTime,
        emergency_alert: safetyInfo.emergencyAlert,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create event safety info: ${error.message}`);
    return this.mapEventSafetyFromDB(data);
  }

  async getEventSafetyInfo(eventId: string, userId: string): Promise<EventSafetyInfo | null> {
    const { data, error } = await this.getClient()
      .from('event_safety')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get event safety info: ${error.message}`);
    }
    return this.mapEventSafetyFromDB(data);
  }

  async updateEventSafetyInfo(id: string, updates: Partial<EventSafetyInfo>): Promise<EventSafetyInfo | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.trustedContacts !== undefined) dbUpdates.trusted_contacts = updates.trustedContacts;
    if (updates.checkInTime !== undefined) dbUpdates.check_in_time = updates.checkInTime;
    if (updates.checkOutTime !== undefined) dbUpdates.check_out_time = updates.checkOutTime;
    if (updates.emergencyAlert !== undefined) dbUpdates.emergency_alert = updates.emergencyAlert;

    const { data, error } = await this.getClient()
      .from('event_safety')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update event safety info: ${error.message}`);
    return this.mapEventSafetyFromDB(data);
  }

  async createEventAttendee(attendee: EventAttendee): Promise<EventAttendee> {
    const { data, error } = await this.getClient()
      .from('event_attendees')
      .insert({
        id: attendee.id,
        event_id: attendee.eventId,
        user_id: attendee.userId,
        status: attendee.status,
        ticket_id: attendee.ticketId,
        paid_amount: attendee.paidAmount,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create event attendee: ${error.message}`);
    return this.mapEventAttendeeFromDB(data);
  }

  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    const { data, error } = await this.getClient()
      .from('event_attendees')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw new Error(`Failed to get event attendees: ${error.message}`);
    return data.map(attendee => this.mapEventAttendeeFromDB(attendee));
  }

  async getUserAttendance(userId: string, eventId: string): Promise<EventAttendee | null> {
    const { data, error } = await this.getClient()
      .from('event_attendees')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get user attendance: ${error.message}`);
    }
    return this.mapEventAttendeeFromDB(data);
  }

  async updateEventAttendee(id: string, updates: Partial<EventAttendee>): Promise<EventAttendee | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.ticketId !== undefined) dbUpdates.ticket_id = updates.ticketId;
    if (updates.paidAmount !== undefined) dbUpdates.paid_amount = updates.paidAmount;

    const { data, error } = await this.getClient()
      .from('event_attendees')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update event attendee: ${error.message}`);
    return this.mapEventAttendeeFromDB(data);
  }

  async createVerificationRequest(request: VerificationRequest): Promise<VerificationRequest> {
    const { data, error } = await this.getClient()
      .from('verification_requests')
      .insert({
        id: request.id,
        user_id: request.userId,
        photo_url: request.photoUrl,
        status: request.status,
        reason: request.reason,
        reviewed_at: request.reviewedAt,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create verification request: ${error.message}`);
    return this.mapVerificationRequestFromDB(data);
  }

  async getVerificationRequestByUserId(userId: string): Promise<VerificationRequest | null> {
    const { data, error } = await this.getClient()
      .from('verification_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get verification request: ${error.message}`);
    }
    return this.mapVerificationRequestFromDB(data);
  }

  async getVerificationRequestById(id: string): Promise<VerificationRequest | null> {
    const { data, error } = await this.getClient()
      .from('verification_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get verification request: ${error.message}`);
    }
    return this.mapVerificationRequestFromDB(data);
  }

  async getAllVerificationRequests(): Promise<VerificationRequest[]> {
    const { data, error } = await this.getClient()
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get all verification requests: ${error.message}`);
    return data.map(req => this.mapVerificationRequestFromDB(req));
  }

  async updateVerificationRequest(id: string, updates: Partial<VerificationRequest>): Promise<VerificationRequest | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.reason !== undefined) dbUpdates.reason = updates.reason;
    if (updates.reviewedAt !== undefined) dbUpdates.reviewed_at = updates.reviewedAt;

    const { data, error } = await this.getClient()
      .from('verification_requests')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update verification request: ${error.message}`);
    return this.mapVerificationRequestFromDB(data);
  }

  async createPayment(payment: Payment): Promise<Payment> {
    const { data, error } = await this.getClient()
      .from('payments')
      .insert({
        id: payment.id,
        user_id: payment.userId,
        event_id: payment.eventId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        stripe_payment_intent_id: payment.stripePaymentIntentId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create payment: ${error.message}`);
    return this.mapPaymentFromDB(data);
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    const { data, error } = await this.getClient()
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get payment: ${error.message}`);
    }
    return this.mapPaymentFromDB(data);
  }

  async getPaymentsByUserId(userId: string): Promise<Payment[]> {
    const { data, error } = await this.getClient()
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get payments by user: ${error.message}`);
    return data.map(payment => this.mapPaymentFromDB(payment));
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.stripePaymentIntentId !== undefined) dbUpdates.stripe_payment_intent_id = updates.stripePaymentIntentId;

    const { data, error } = await this.getClient()
      .from('payments')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update payment: ${error.message}`);
    return this.mapPaymentFromDB(data);
  }

  async createPayout(payout: Payout): Promise<Payout> {
    const { data, error } = await this.getClient()
      .from('payouts')
      .insert({
        id: payout.id,
        creator_id: payout.creatorId,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        stripe_payout_id: payout.stripePayoutId,
        event_ids: payout.eventIds,
        completed_at: payout.completedAt,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create payout: ${error.message}`);
    return this.mapPayoutFromDB(data);
  }

  async getPayoutById(id: string): Promise<Payout | null> {
    const { data, error } = await this.getClient()
      .from('payouts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get payout: ${error.message}`);
    }
    return this.mapPayoutFromDB(data);
  }

  async getPayoutsByCreatorId(creatorId: string): Promise<Payout[]> {
    const { data, error } = await this.getClient()
      .from('payouts')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get payouts by creator: ${error.message}`);
    return data.map(payout => this.mapPayoutFromDB(payout));
  }

  async updatePayout(id: string, updates: Partial<Payout>): Promise<Payout | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.stripePayoutId !== undefined) dbUpdates.stripe_payout_id = updates.stripePayoutId;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;

    const { data, error } = await this.getClient()
      .from('payouts')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update payout: ${error.message}`);
    return this.mapPayoutFromDB(data);
  }

  async createEventReminder(reminder: EventReminder): Promise<EventReminder> {
    const { data, error } = await this.getClient()
      .from('event_reminders')
      .insert({
        id: reminder.id,
        event_id: reminder.eventId,
        user_id: reminder.userId,
        reminder_type: reminder.reminderType,
        scheduled_time: reminder.scheduledTime,
        sent: reminder.sent,
        sent_at: reminder.sentAt,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create event reminder: ${error.message}`);
    return this.mapEventReminderFromDB(data);
  }

  async getEventReminders(eventId: string, userId: string): Promise<EventReminder[]> {
    const { data, error } = await this.getClient()
      .from('event_reminders')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to get event reminders: ${error.message}`);
    return data.map(reminder => this.mapEventReminderFromDB(reminder));
  }

  async updateEventReminder(id: string, updates: Partial<EventReminder>): Promise<EventReminder | null> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.sent !== undefined) dbUpdates.sent = updates.sent;
    if (updates.sentAt !== undefined) dbUpdates.sent_at = updates.sentAt;

    const { data, error } = await this.getClient()
      .from('event_reminders')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update event reminder: ${error.message}`);
    return this.mapEventReminderFromDB(data);
  }

  async createEventUpdate(eventUpdate: EventUpdate): Promise<EventUpdate> {
    const { data, error } = await this.getClient()
      .from('event_updates')
      .insert({
        id: eventUpdate.id,
        event_id: eventUpdate.eventId,
        update_type: eventUpdate.updateType,
        old_value: eventUpdate.oldValue,
        new_value: eventUpdate.newValue,
        message: eventUpdate.message,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create event update: ${error.message}`);
    return this.mapEventUpdateFromDB(data);
  }

  async getEventUpdates(eventId: string): Promise<EventUpdate[]> {
    const { data, error } = await this.getClient()
      .from('event_updates')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get event updates: ${error.message}`);
    return data.map(update => this.mapEventUpdateFromDB(update));
  }

  private mapUserFromDB(data: Record<string, unknown>): User {
    return {
      id: data.id as string,
      email: data.email as string,
      name: data.name as string,
      dateOfBirth: new Date(data.date_of_birth as string),
      age: data.age as number,
      createdAt: new Date(data.created_at as string),
      pushToken: data.push_token as string | undefined,
    };
  }

  private mapProfileFromDB(data: Record<string, unknown>): UserProfile {
    return {
      userId: data.user_id as string,
      role: data.role as UserProfile['role'],
      bio: data.bio as string | undefined,
      photoUrl: data.photo_url as string | undefined,
      interests: (data.interests as string[]) || [],
      personalityTraits: (data.personality_traits as string[]) || [],
      dealbreakers: (data.dealbreakers as string[]) || [],
      relationshipGoal: data.relationship_goal as UserProfile['relationshipGoal'],
      location: data.location as string,
      ageRangeMin: data.age_range_min as number | undefined,
      ageRangeMax: data.age_range_max as number | undefined,
      verificationStatus: data.verification_status as UserProfile['verificationStatus'],
      verificationPhoto: data.verification_photo as string | undefined,
      premiumTier: data.premium_tier as UserProfile['premiumTier'],
      premiumExpiresAt: data.premium_expires_at ? new Date(data.premium_expires_at as string) : undefined,
    };
  }

  private mapEventFromDB(data: Record<string, unknown>): Event {
    return {
      id: data.id as string,
      creatorId: data.creator_id as string,
      title: data.title as string,
      description: data.description as string,
      date: new Date(data.date as string),
      time: data.time as string,
      location: data.location as string,
      latitude: data.latitude as number | undefined,
      longitude: data.longitude as number | undefined,
      category: data.category as Event['category'],
      vibes: (data.vibes as Event['vibes']) || [],
      imageUrl: data.image_url as string,
      capacity: data.capacity as number | undefined,
      spotsAvailable: data.spots_available as number | undefined,
      attendeeIds: (data.attendee_ids as string[]) || [],
      status: data.status as Event['status'],
      isDraft: data.is_draft as boolean,
      isPaid: data.is_paid as boolean,
      price: data.price as number | undefined,
      currency: data.currency as string | undefined,
      views: data.views as number,
      likes: data.likes as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private mapFavoriteFromDB(data: Record<string, unknown>): FavoriteEvent {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      eventId: data.event_id as string,
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapMessageFromDB(data: Record<string, unknown>): Message {
    return {
      id: data.id as string,
      senderId: data.sender_id as string,
      receiverId: data.receiver_id as string,
      content: data.content as string,
      read: data.read as boolean,
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapConversationFromDB(data: Record<string, unknown>): Conversation {
    return {
      id: data.id as string,
      participantIds: data.participant_ids as string[],
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private mapRatingFromDB(data: Record<string, unknown>): Rating {
    return {
      id: data.id as string,
      eventId: data.event_id as string,
      reviewerId: data.reviewer_id as string,
      creatorId: data.creator_id as string,
      rating: data.rating as number,
      review: data.review as string | undefined,
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapBlockedUserFromDB(data: Record<string, unknown>): BlockedUser {
    return {
      id: data.id as string,
      blockerId: data.blocker_id as string,
      blockedId: data.blocked_id as string,
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapReportFromDB(data: Record<string, unknown>): Report {
    return {
      id: data.id as string,
      reporterId: data.reporter_id as string,
      reportedId: data.reported_id as string,
      reason: data.reason as string,
      description: data.description as string | undefined,
      status: data.status as Report['status'],
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapNotificationFromDB(data: Record<string, unknown>): Notification {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      type: data.type as Notification['type'],
      title: data.title as string,
      body: data.body as string,
      data: data.data as Notification['data'],
      read: data.read as boolean,
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapNotificationSettingsFromDB(data: Record<string, unknown>): NotificationSettings {
    return {
      userId: data.user_id as string,
      newMessages: data.new_messages as boolean,
      profileLikes: data.profile_likes as boolean,
      eventReminders: data.event_reminders as boolean,
      messageReplies: data.message_replies as boolean,
      eventFillingUp: data.event_filling_up as boolean,
      pushEnabled: data.push_enabled as boolean,
    };
  }

  private mapEventSafetyFromDB(data: Record<string, unknown>): EventSafetyInfo {
    return {
      id: data.id as string,
      eventId: data.event_id as string,
      userId: data.user_id as string,
      trustedContacts: data.trusted_contacts as EventSafetyInfo['trustedContacts'],
      checkInTime: data.check_in_time ? new Date(data.check_in_time as string) : undefined,
      checkOutTime: data.check_out_time ? new Date(data.check_out_time as string) : undefined,
      emergencyAlert: data.emergency_alert as boolean | undefined,
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapEventAttendeeFromDB(data: Record<string, unknown>): EventAttendee {
    return {
      id: data.id as string,
      eventId: data.event_id as string,
      userId: data.user_id as string,
      status: data.status as EventAttendee['status'],
      ticketId: data.ticket_id as string | undefined,
      paidAmount: data.paid_amount as number | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private mapVerificationRequestFromDB(data: Record<string, unknown>): VerificationRequest {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      photoUrl: data.photo_url as string,
      status: data.status as VerificationRequest['status'],
      reason: data.reason as string | undefined,
      createdAt: new Date(data.created_at as string),
      reviewedAt: data.reviewed_at ? new Date(data.reviewed_at as string) : undefined,
    };
  }

  private mapPaymentFromDB(data: Record<string, unknown>): Payment {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      eventId: data.event_id as string,
      amount: data.amount as number,
      currency: data.currency as string,
      status: data.status as Payment['status'],
      stripePaymentIntentId: data.stripe_payment_intent_id as string | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private mapPayoutFromDB(data: Record<string, unknown>): Payout {
    return {
      id: data.id as string,
      creatorId: data.creator_id as string,
      amount: data.amount as number,
      currency: data.currency as string,
      status: data.status as Payout['status'],
      stripePayoutId: data.stripe_payout_id as string | undefined,
      eventIds: data.event_ids as string[],
      createdAt: new Date(data.created_at as string),
      completedAt: data.completed_at ? new Date(data.completed_at as string) : undefined,
    };
  }

  private mapEventReminderFromDB(data: Record<string, unknown>): EventReminder {
    return {
      id: data.id as string,
      eventId: data.event_id as string,
      userId: data.user_id as string,
      reminderType: data.reminder_type as EventReminder['reminderType'],
      scheduledTime: new Date(data.scheduled_time as string),
      sent: data.sent as boolean,
      sentAt: data.sent_at ? new Date(data.sent_at as string) : undefined,
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapEventUpdateFromDB(data: Record<string, unknown>): EventUpdate {
    return {
      id: data.id as string,
      eventId: data.event_id as string,
      updateType: data.update_type as EventUpdate['updateType'],
      oldValue: data.old_value as string | undefined,
      newValue: data.new_value as string | undefined,
      message: data.message as string | undefined,
      createdAt: new Date(data.created_at as string),
    };
  }
}

export const db = new SupabaseDB();
