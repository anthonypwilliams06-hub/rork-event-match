import { db } from './db';
import { NotificationType } from '@/types';
import { randomBytes } from 'crypto';

export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: {
    eventId?: string;
    messageId?: string;
    senderId?: string;
    conversationId?: string;
  }
) {
  const notification = db.createNotification({
    id: randomBytes(16).toString('hex'),
    userId,
    type,
    title,
    body,
    data,
    read: false,
    createdAt: new Date(),
  });

  console.log(`Notification created for user ${userId}: ${title}`);
  return notification;
}

export function notifyNewMessage(receiverId: string, senderName: string, messageId: string, senderId: string) {
  return createNotification(
    receiverId,
    'new_message',
    'New Message',
    `${senderName} sent you a message`,
    { messageId, senderId }
  );
}

export function notifyProfileLiked(userId: string, likerName: string, eventId: string) {
  return createNotification(
    userId,
    'profile_liked',
    'Someone likes you!',
    `${likerName} liked your profile`,
    { eventId }
  );
}

export function notifyEventReminder(userId: string, eventTitle: string, eventId: string) {
  return createNotification(
    userId,
    'event_reminder',
    'Event Starting Soon',
    `${eventTitle} is happening soon!`,
    { eventId }
  );
}

export function notifyMessageReply(receiverId: string, senderName: string, messageId: string, senderId: string) {
  return createNotification(
    receiverId,
    'message_reply',
    'New Reply',
    `${senderName} replied to your message`,
    { messageId, senderId }
  );
}

export function notifyEventFillingUp(userId: string, eventTitle: string, spotsLeft: number, eventId: string) {
  return createNotification(
    userId,
    'event_filling_up',
    'Event Filling Up',
    `Only ${spotsLeft} spots left for ${eventTitle}!`,
    { eventId }
  );
}

export function notifyEventFull(userId: string, eventTitle: string, eventId: string) {
  return createNotification(
    userId,
    'event_full',
    'Event Full',
    `${eventTitle} is now at full capacity`,
    { eventId }
  );
}
