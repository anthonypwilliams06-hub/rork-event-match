import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const listConversationsProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('List conversations');

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    const conversations = db.getConversationsByUserId(session.userId);

    const conversationsWithUsers = conversations.map(conv => {
      const otherUserId = conv.participantIds.find(id => id !== session.userId);
      const otherUser = otherUserId ? db.getUserById(otherUserId) : undefined;
      return {
        ...conv,
        otherUser: otherUser ? {
          id: otherUser.id,
          name: otherUser.name,
          profile: otherUser.profile,
        } : undefined,
      };
    });

    console.log('Conversations found:', conversationsWithUsers.length);
    return { conversations: conversationsWithUsers };
  });
