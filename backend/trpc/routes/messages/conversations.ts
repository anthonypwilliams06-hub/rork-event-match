import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { getSupabase } from '@/lib/supabase';

export const listConversationsProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('List conversations');

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const conversations = await db.getConversationsByUserId(user.id);

    const conversationsWithUsersPromises = conversations.map(async (conv) => {
      const otherUserId = conv.participantIds.find(id => id !== user.id);
      const otherUser = otherUserId ? await db.getUserById(otherUserId) : null;
      const otherProfile = otherUserId ? await db.getProfileByUserId(otherUserId) : null;
      return {
        ...conv,
        otherUser: otherUser ? {
          id: otherUser.id,
          name: otherUser.name,
          profile: otherProfile,
        } : undefined,
      };
    });

    const conversationsWithUsers = await Promise.all(conversationsWithUsersPromises);

    console.log('Conversations found:', conversationsWithUsers.length);
    return { conversations: conversationsWithUsers };
  });
