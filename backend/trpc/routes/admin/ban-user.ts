import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db, getSupabaseAdmin } from '../../../db';
import { getSupabase } from '@/lib/supabase';

export const banUserProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Ban user:', input.userId);

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const targetUser = await db.getUserById(input.userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      input.userId,
      { ban_duration: 'none' }
    );

    if (banError) {
      console.error('Failed to ban user:', banError);
      throw new Error('Failed to ban user');
    }

    const { error: disableError } = await supabaseAdmin
      .from('profiles')
      .update({ is_banned: true })
      .eq('user_id', input.userId);

    if (disableError) {
      console.error('Failed to update profile:', disableError);
    }

    const { error: eventsError } = await supabaseAdmin
      .from('events')
      .update({ status: 'cancelled', is_deleted: true })
      .eq('creator_id', input.userId);

    if (eventsError) {
      console.error('Failed to hide events:', eventsError);
    }

    console.log('User banned successfully:', input.userId);
    return { success: true };
  });
