import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const getRSVPStatusSchema = z.object({
  token: z.string(),
  eventId: z.string(),
});

export const getRSVPStatusProcedure = publicProcedure
  .input(getRSVPStatusSchema)
  .query(async ({ input }) => {
    const user = await db.getUserById(input.token);
    if (!user) {
      throw new Error('User not found');
    }

    const attendance = await db.getUserAttendance(user.id, input.eventId);
    
    return {
      hasRSVP: !!attendance,
      status: attendance?.status || null,
      waitlistPosition: attendance?.waitlistPosition || null,
    };
  });
