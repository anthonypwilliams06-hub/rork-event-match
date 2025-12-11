import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const listAttendeesSchema = z.object({
  eventId: z.string(),
});

export const listAttendeesProcedure = publicProcedure
  .input(listAttendeesSchema)
  .query(async ({ input }) => {
    const attendees = db.getEventAttendees(input.eventId);
    
    const attendeesWithProfiles = attendees.map(attendee => {
      const user = db.getUserById(attendee.userId);
      const profile = db.getProfileByUserId(attendee.userId);
      
      return {
        ...attendee,
        user: user ? {
          id: user.id,
          name: user.name,
          age: user.age,
        } : undefined,
        profile: profile ? {
          photoUrl: profile.photoUrl,
          verificationStatus: profile.verificationStatus,
        } : undefined,
      };
    });

    return attendeesWithProfiles;
  });
