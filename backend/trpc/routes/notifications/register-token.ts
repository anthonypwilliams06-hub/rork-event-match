import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';

export const registerTokenProcedure = publicProcedure
  .input(z.object({
    sessionToken: z.string(),
    pushToken: z.string(),
  }))
  .mutation(async ({ input }) => {
    const session = db.getSession(input.sessionToken);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    console.log('Register push token for user:', session.userId, input.pushToken);
    
    db.updateUser(session.userId, { pushToken: input.pushToken });
    
    return { success: true };
  });
