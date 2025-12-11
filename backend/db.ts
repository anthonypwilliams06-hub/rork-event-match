import { User, UserProfile, Event, FavoriteEvent, Message, Conversation, Rating, BlockedUser, Report, Notification, NotificationSettings } from '@/types';

interface PasswordResetToken {
  email: string;
  token: string;
  expiresAt: Date;
}

interface SessionToken {
  userId: string;
  token: string;
  expiresAt: Date;
}

export class InMemoryDB {
  private users: Map<string, User & { passwordHash: string }> = new Map();
  private profiles: Map<string, UserProfile> = new Map();
  private resetTokens: Map<string, PasswordResetToken> = new Map();
  private sessions: Map<string, SessionToken> = new Map();
  private events: Map<string, Event> = new Map();
  private favorites: Map<string, FavoriteEvent> = new Map();
  private messages: Map<string, Message> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private ratings: Map<string, Rating> = new Map();
  private blockedUsers: Map<string, BlockedUser> = new Map();
  private reports: Map<string, Report> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private notificationSettings: Map<string, NotificationSettings> = new Map();

  createUser(user: User & { passwordHash: string }): User & { passwordHash: string } {
    this.users.set(user.id, user);
    return user;
  }

  getUserById(id: string): (User & { passwordHash: string }) | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): (User & { passwordHash: string }) | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  createProfile(profile: UserProfile): UserProfile {
    this.profiles.set(profile.userId, profile);
    return profile;
  }

  getProfileByUserId(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  updateProfile(userId: string, updates: Partial<UserProfile>): UserProfile | undefined {
    const profile = this.profiles.get(userId);
    if (!profile) return undefined;
    
    const updated = { ...profile, ...updates };
    this.profiles.set(userId, updated);
    return updated;
  }

  createResetToken(resetToken: PasswordResetToken): void {
    this.resetTokens.set(resetToken.token, resetToken);
  }

  getResetToken(token: string): PasswordResetToken | undefined {
    return this.resetTokens.get(token);
  }

  deleteResetToken(token: string): void {
    this.resetTokens.delete(token);
  }

  createSession(session: SessionToken): void {
    this.sessions.set(session.token, session);
  }

  getSession(token: string): SessionToken | undefined {
    return this.sessions.get(token);
  }

  deleteSession(token: string): void {
    this.sessions.delete(token);
  }

  cleanExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
  }

  cleanExpiredResetTokens(): void {
    const now = new Date();
    for (const [token, resetToken] of this.resetTokens.entries()) {
      if (resetToken.expiresAt < now) {
        this.resetTokens.delete(token);
      }
    }
  }

  createEvent(event: Event): Event {
    this.events.set(event.id, event);
    return event;
  }

  getEventById(id: string): Event | undefined {
    return this.events.get(id);
  }

  getEventsByCreatorId(creatorId: string): Event[] {
    return Array.from(this.events.values()).filter(e => e.creatorId === creatorId);
  }

  getAllEvents(): Event[] {
    return Array.from(this.events.values());
  }

  updateEvent(id: string, updates: Partial<Event>): Event | undefined {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updated = { ...event, ...updates, updatedAt: new Date() };
    this.events.set(id, updated);
    return updated;
  }

  deleteEvent(id: string): boolean {
    return this.events.delete(id);
  }

  createFavorite(favorite: FavoriteEvent): FavoriteEvent {
    this.favorites.set(favorite.id, favorite);
    return favorite;
  }

  getFavoriteById(id: string): FavoriteEvent | undefined {
    return this.favorites.get(id);
  }

  getFavoriteByUserAndEvent(userId: string, eventId: string): FavoriteEvent | undefined {
    return Array.from(this.favorites.values()).find(
      f => f.userId === userId && f.eventId === eventId
    );
  }

  getFavoritesByUserId(userId: string): FavoriteEvent[] {
    return Array.from(this.favorites.values()).filter(f => f.userId === userId);
  }

  deleteFavorite(id: string): boolean {
    return this.favorites.delete(id);
  }

  createMessage(message: Message): Message {
    this.messages.set(message.id, message);
    return message;
  }

  getMessageById(id: string): Message | undefined {
    return this.messages.get(id);
  }

  getMessagesBetweenUsers(userId1: string, userId2: string): Message[] {
    return Array.from(this.messages.values()).filter(
      m => (m.senderId === userId1 && m.receiverId === userId2) || (m.senderId === userId2 && m.receiverId === userId1)
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  markMessageAsRead(id: string): Message | undefined {
    const message = this.messages.get(id);
    if (!message) return undefined;
    message.read = true;
    return message;
  }

  createOrUpdateConversation(conversation: Conversation): Conversation {
    const existingConv = Array.from(this.conversations.values()).find(
      c => c.participantIds.sort().join(',') === conversation.participantIds.sort().join(',')
    );
    if (existingConv) {
      const updated = { ...existingConv, ...conversation };
      this.conversations.set(existingConv.id, updated);
      return updated;
    }
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  getConversationById(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  getConversationsByUserId(userId: string): Conversation[] {
    return Array.from(this.conversations.values())
      .filter(c => c.participantIds.includes(userId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  createRating(rating: Rating): Rating {
    this.ratings.set(rating.id, rating);
    return rating;
  }

  getRatingById(id: string): Rating | undefined {
    return this.ratings.get(id);
  }

  getRatingsByCreatorId(creatorId: string): Rating[] {
    return Array.from(this.ratings.values()).filter(r => r.creatorId === creatorId);
  }

  getRatingByEventAndReviewer(eventId: string, reviewerId: string): Rating | undefined {
    return Array.from(this.ratings.values()).find(
      r => r.eventId === eventId && r.reviewerId === reviewerId
    );
  }

  updateRating(id: string, updates: Partial<Rating>): Rating | undefined {
    const rating = this.ratings.get(id);
    if (!rating) return undefined;
    const updated = { ...rating, ...updates };
    this.ratings.set(id, updated);
    return updated;
  }

  createBlockedUser(blockedUser: BlockedUser): BlockedUser {
    this.blockedUsers.set(blockedUser.id, blockedUser);
    return blockedUser;
  }

  getBlockedUser(blockerId: string, blockedId: string): BlockedUser | undefined {
    return Array.from(this.blockedUsers.values()).find(
      b => b.blockerId === blockerId && b.blockedId === blockedId
    );
  }

  getBlockedUsersByBlockerId(blockerId: string): BlockedUser[] {
    return Array.from(this.blockedUsers.values()).filter(b => b.blockerId === blockerId);
  }

  deleteBlockedUser(id: string): boolean {
    return this.blockedUsers.delete(id);
  }

  createReport(report: Report): Report {
    this.reports.set(report.id, report);
    return report;
  }

  getReportById(id: string): Report | undefined {
    return this.reports.get(id);
  }

  getAllReports(): Report[] {
    return Array.from(this.reports.values());
  }

  createNotification(notification: Notification): Notification {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  getNotificationById(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  getNotificationsByUserId(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  markNotificationAsRead(id: string): Notification | undefined {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    notification.read = true;
    return notification;
  }

  markAllNotificationsAsRead(userId: string): void {
    const userNotifications = this.getNotificationsByUserId(userId);
    userNotifications.forEach(notification => {
      notification.read = true;
    });
  }

  deleteNotification(id: string): boolean {
    return this.notifications.delete(id);
  }

  getNotificationSettings(userId: string): NotificationSettings | undefined {
    return this.notificationSettings.get(userId);
  }

  createOrUpdateNotificationSettings(settings: NotificationSettings): NotificationSettings {
    this.notificationSettings.set(settings.userId, settings);
    return settings;
  }
}

export const db = new InMemoryDB();
