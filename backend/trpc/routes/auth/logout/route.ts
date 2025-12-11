import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';

const logoutSchema = z.object({
  token: z.string(),
});

export const logoutProcedure = publicProcedure
  .input(logoutSchema)
  .mutation(async ({ input }) => {
    console.log('Logout attempt');

    db.deleteSession(input.token);

    console.log('Logout successful');

    return { success: true };
  });
