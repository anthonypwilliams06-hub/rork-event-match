import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';
import { notifyNewMessage } from '../../../notifications';
import { supabase } from '@/lib/supabase';

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

    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const receiver = await db.getUserById(input.receiverId);
    if (!receiver) {
      throw new Error('Receiver not found');
    }

    const blocked = await db.getBlockedUser(input.receiverId, user.id);
    if (blocked) {
      throw new Error('You are blocked by this user');
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

    console.log('Message sent:', message.id);
    return { message };
  });
