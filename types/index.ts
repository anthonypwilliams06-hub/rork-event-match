export type UserRole = 'creator' | 'seeker' | null;

export type RelationshipGoal = 'casual' | 'serious' | 'friendship' | 'open';

export type EventCategory = 
  | 'food_drink'
  | 'outdoor'
  | 'entertainment'
  | 'sports'
  | 'arts_culture'
  | 'social'
  | 'other';

export interface Interest {
  id: string;
  name: string;
  category: string;
}

export interface PersonalityTrait {
  id: string;
  name: string;
}

export interface CreatorProfile {
  id: string;
  role: 'creator';
  name: string;
  age: number;
  bio: string;
  photoUrl: string;
  interests: string[];
  personalityTraits: string[];
  relationshipGoal: RelationshipGoal;
  location: string;
}

export interface SeekerPreferences {
  id: string;
  role: 'seeker';
  name: string;
  age: number;
  photoUrl: string;
  relationshipGoal: RelationshipGoal;
  interests: string[];
  preferredTraits: string[];
  ageRange: { min: number; max: number };
  location: string;
}

export type EventStatus = 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'full';

export interface Event {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  location: string;
  category: EventCategory;
  imageUrl: string;
  capacity?: number;
  spotsAvailable?: number;
  status: EventStatus;
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchScore {
  totalScore: number;
  breakdown: {
    interestMatch: number;
    personalityMatch: number;
    relationshipGoalMatch: number;
    ageMatch: number;
  };
  sharedInterests: string[];
  sharedTraits: string[];
}

export interface EventWithMatch {
  event: Event;
  creator: CreatorProfile;
  matchScore: MatchScore;
}

export interface User {
  id: string;
  email: string;
  name: string;
  dateOfBirth: Date;
  age: number;
  createdAt: Date;
  profile?: UserProfile;
  pushToken?: string;
}

export interface UserProfile {
  userId: string;
  role: UserRole;
  bio?: string;
  photoUrl?: string;
  interests: string[];
  personalityTraits: string[];
  relationshipGoal?: RelationshipGoal;
  location: string;
  ageRangeMin?: number;
  ageRangeMax?: number;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  dateOfBirth: Date;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface FavoriteEvent {
  id: string;
  userId: string;
  eventId: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  updatedAt: Date;
}

export interface Rating {
  id: string;
  eventId: string;
  reviewerId: string;
  creatorId: string;
  rating: number;
  review?: string;
  createdAt: Date;
}

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  description?: string;
  createdAt: Date;
  status: 'pending' | 'reviewed' | 'resolved';
}

export interface CreatorStats {
  averageRating: number;
  totalRatings: number;
  totalEvents: number;
}

export type NotificationType = 
  | 'new_message'
  | 'profile_liked'
  | 'event_reminder'
  | 'message_reply'
  | 'event_filling_up'
  | 'event_full';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    eventId?: string;
    messageId?: string;
    senderId?: string;
    conversationId?: string;
  };
  read: boolean;
  createdAt: Date;
}

export interface NotificationSettings {
  userId: string;
  newMessages: boolean;
  profileLikes: boolean;
  eventReminders: boolean;
  messageReplies: boolean;
  eventFillingUp: boolean;
  pushEnabled: boolean;
}
