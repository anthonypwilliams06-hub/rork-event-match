import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';
import { supabase } from '@/lib/supabase';

export const reportUserProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      reportedId: z.string(),
      reason: z.string(),
      description: z.string().max(500).optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Report user');

    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    if (user.id === input.reportedId) {
      throw new Error('Cannot report yourself');
    }

    const reportedUser = await db.getUserById(input.reportedId);
    if (!reportedUser) {
      throw new Error('User not found');
    }

    const report = await db.createReport({
      id: randomBytes(16).toString('hex'),
      reporterId: user.id,
      reportedId: input.reportedId,
      reason: input.reason,
      description: input.description,
      createdAt: new Date(),
      status: 'pending',
    });

    console.log('Report created:', report.id);
    return { success: true };
  });
