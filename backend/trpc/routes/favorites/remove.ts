import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { getSupabase } from '@/lib/supabase';

export const removeFavoriteProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      eventId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Remove favorite:', input);

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const favorite = await db.getFavoriteByUserAndEvent(user.id, input.eventId);
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    await db.deleteFavorite(favorite.id);

    console.log('Favorite removed');
    return { success: true };
  });
