import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';
import { notifyNewMessage } from '../../../notifications';
import { getSupabase } from '@/lib/supabase';

const messageRateLimits = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_MESSAGES = 10;

const SPAM_PATTERNS = [
  /bit\.ly\//i,
  /tinyurl\.com\//i,
  /goo\.gl\//i,
  /t\.co\//i,
  /telegram\.me\//i,
  /whatsapp\.com\//i,
  /cash\.app\//i,
  /venmo\.com\//i,
  /paypal\.me\//i,
];

function isSpam(content: string): boolean {
  return SPAM_PATTERNS.some(pattern => pattern.test(content));
}

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = messageRateLimits.get(userId);

  if (!userLimit || now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
    messageRateLimits.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_MESSAGES - 1 };
  }

  if (userLimit.count >= RATE_LIMIT_MAX_MESSAGES) {
    return { allowed: false, remaining: 0 };
  }

  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_MESSAGES - userLimit.count };
}

export const sendMessageProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      receiverId: z.string(),
      content: z.string().min(1).max(1000),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Send message');

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded. Please wait before sending more messages.');
    }

    if (isSpam(input.content)) {
      console.warn('Spam detected from user:', user.id);
      throw new Error('Message blocked: suspicious links detected');
    }

    const receiver = await db.getUserById(input.receiverId);
    if (!receiver) {
      throw new Error('Receiver not found');
    }

    const blocked = await db.getBlockedUser(input.receiverId, user.id);
    if (blocked) {
      throw new Error('You are blocked by this user');
    }

    const blockedByMe = await db.getBlockedUser(user.id, input.receiverId);
    if (blockedByMe) {
      throw new Error('You have blocked this user');
    }

    const muted = await db.getMutedUser(input.receiverId, user.id);
    if (muted) {
      throw new Error('You have been muted by this user');
    }

    const sharedEvents = await db.getSharedEvents(user.id, input.receiverId);
    const hasSharedGoingRSVP = sharedEvents.some(event => {
      const userAttendance = event.attendees.find(a => a.userId === user.id);
      const otherAttendance = event.attendees.find(a => a.userId === input.receiverId);
      return userAttendance?.status === 'going' && otherAttendance?.status === 'going';
    });

    if (!hasSharedGoingRSVP) {
      throw new Error('You can only message users you share a "Going" RSVP with');
    }

    const message = await db.createMessage({
      id: randomBytes(16).toString('hex'),
      senderId: user.id,
      receiverId: input.receiverId,
      content: input.content,
      read: false,
      createdAt: new Date(),
    });

    const conversationId = randomBytes(16).toString('hex');
    await db.createOrUpdateConversation({
      id: conversationId,
      participantIds: [user.id, input.receiverId],
      lastMessage: message,
      updatedAt: new Date(),
    });

    const sender = await db.getUserById(user.id);
    if (sender) {
      notifyNewMessage(input.receiverId, sender.name, message.id, user.id);
    }

    console.log('Message sent:', message.id, 'Remaining:', rateLimit.remaining);
    return { message, rateLimitRemaining: rateLimit.remaining };
  });
