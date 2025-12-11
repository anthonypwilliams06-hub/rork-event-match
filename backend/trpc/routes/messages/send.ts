import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';
import { notifyNewMessage } from '../../../notifications';

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

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    const receiver = db.getUserById(input.receiverId);
    if (!receiver) {
      throw new Error('Receiver not found');
    }

    const blocked = db.getBlockedUser(input.receiverId, session.userId);
    if (blocked) {
      throw new Error('You are blocked by this user');
    }

    const message = db.createMessage({
      id: randomBytes(16).toString('hex'),
      senderId: session.userId,
      receiverId: input.receiverId,
      content: input.content,
      read: false,
      createdAt: new Date(),
    });

    const conversationId = randomBytes(16).toString('hex');
    db.createOrUpdateConversation({
      id: conversationId,
      participantIds: [session.userId, input.receiverId],
      lastMessage: message,
      updatedAt: new Date(),
    });

    const sender = db.getUserById(session.userId);
    if (sender) {
      notifyNewMessage(input.receiverId, sender.name, message.id, session.userId);
    }

    console.log('Message sent:', message.id);
    return { message };
  });
