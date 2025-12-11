import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';

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

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    if (session.userId === input.reportedId) {
      throw new Error('Cannot report yourself');
    }

    const reportedUser = db.getUserById(input.reportedId);
    if (!reportedUser) {
      throw new Error('User not found');
    }

    const report = db.createReport({
      id: randomBytes(16).toString('hex'),
      reporterId: session.userId,
      reportedId: input.reportedId,
      reason: input.reason,
      description: input.description,
      createdAt: new Date(),
      status: 'pending',
    });

    console.log('Report created:', report.id);
    return { success: true };
  });
