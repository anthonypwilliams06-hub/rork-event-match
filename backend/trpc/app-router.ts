import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { signupProcedure } from "./routes/auth/signup/route";
import { loginProcedure } from "./routes/auth/login/route";
import { logoutProcedure } from "./routes/auth/logout/route";
import { requestResetProcedure } from "./routes/auth/reset-password/request-reset";
import { confirmResetProcedure } from "./routes/auth/reset-password/confirm-reset";
import { createProfileProcedure } from "./routes/profile/create-profile";
import { updateProfileProcedure } from "./routes/profile/update-profile";
import { getProfileProcedure } from "./routes/profile/get-profile";
import { createEventProcedure } from "./routes/events/create";
import { updateEventProcedure } from "./routes/events/update";
import { deleteEventProcedure } from "./routes/events/delete";
import { listEventsProcedure } from "./routes/events/list";
import { getEventProcedure } from "./routes/events/get";
import { addFavoriteProcedure } from "./routes/favorites/add";
import { removeFavoriteProcedure } from "./routes/favorites/remove";
import { listFavoritesProcedure } from "./routes/favorites/list";
import { sendMessageProcedure } from "./routes/messages/send";
import { listMessagesProcedure } from "./routes/messages/list";
import { listConversationsProcedure } from "./routes/messages/conversations";
import { markReadProcedure } from "./routes/messages/mark-read";
import { createRatingProcedure } from "./routes/ratings/create";
import { getCreatorStatsProcedure } from "./routes/ratings/get-stats";
import { listRatingsProcedure } from "./routes/ratings/list";
import { blockUserProcedure } from "./routes/blocking/block";
import { unblockUserProcedure } from "./routes/blocking/unblock";
import { reportUserProcedure } from "./routes/blocking/report";
import { reportEventProcedure } from "./routes/blocking/report-event";
import { listNotificationsProcedure } from "./routes/notifications/list";
import { markReadProcedure as markNotificationReadProcedure } from "./routes/notifications/mark-read";
import { markAllReadProcedure } from "./routes/notifications/mark-all-read";
import { registerTokenProcedure } from "./routes/notifications/register-token";
import { getSettingsProcedure } from "./routes/notifications/get-settings";
import { updateSettingsProcedure } from "./routes/notifications/update-settings";
import { requestVerificationProcedure } from "./routes/verification/request";
import { getVerificationStatusProcedure } from "./routes/verification/status";
import { addEventSafetyProcedure } from "./routes/safety/add-safety";
import { checkInProcedure } from "./routes/safety/check-in";
import { checkOutProcedure } from "./routes/safety/check-out";
import { joinEventProcedure } from "./routes/attendees/join";
import { listAttendeesProcedure } from "./routes/attendees/list";
import { getEventAnalyticsProcedure } from "./routes/analytics/event-analytics";
import { updateRSVPProcedure } from "./routes/rsvp/update-status";
import { setReminderProcedure } from "./routes/rsvp/set-reminder";
import { getRSVPStatusProcedure } from "./routes/rsvp/get-status";
import { createEventUpdateProcedure } from "./routes/events/create-update";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    signup: signupProcedure,
    login: loginProcedure,
    logout: logoutProcedure,
    requestReset: requestResetProcedure,
    confirmReset: confirmResetProcedure,
  }),
  profile: createTRPCRouter({
    create: createProfileProcedure,
    update: updateProfileProcedure,
    get: getProfileProcedure,
  }),
  events: createTRPCRouter({
    create: createEventProcedure,
    update: updateEventProcedure,
    delete: deleteEventProcedure,
    list: listEventsProcedure,
    get: getEventProcedure,
    createUpdate: createEventUpdateProcedure,
  }),
  favorites: createTRPCRouter({
    add: addFavoriteProcedure,
    remove: removeFavoriteProcedure,
    list: listFavoritesProcedure,
  }),
  messages: createTRPCRouter({
    send: sendMessageProcedure,
    list: listMessagesProcedure,
    conversations: listConversationsProcedure,
    markRead: markReadProcedure,
  }),
  ratings: createTRPCRouter({
    create: createRatingProcedure,
    getStats: getCreatorStatsProcedure,
    list: listRatingsProcedure,
  }),
  blocking: createTRPCRouter({
    block: blockUserProcedure,
    unblock: unblockUserProcedure,
    report: reportUserProcedure,
    reportEvent: reportEventProcedure,
  }),
  notifications: createTRPCRouter({
    list: listNotificationsProcedure,
    markRead: markNotificationReadProcedure,
    markAllRead: markAllReadProcedure,
    registerToken: registerTokenProcedure,
    getSettings: getSettingsProcedure,
    updateSettings: updateSettingsProcedure,
  }),
  verification: createTRPCRouter({
    request: requestVerificationProcedure,
    status: getVerificationStatusProcedure,
  }),
  safety: createTRPCRouter({
    addSafety: addEventSafetyProcedure,
    checkIn: checkInProcedure,
    checkOut: checkOutProcedure,
  }),
  attendees: createTRPCRouter({
    join: joinEventProcedure,
    list: listAttendeesProcedure,
  }),
  rsvp: createTRPCRouter({
    updateStatus: updateRSVPProcedure,
    setReminder: setReminderProcedure,
    getStatus: getRSVPStatusProcedure,
  }),
  analytics: createTRPCRouter({
    eventAnalytics: getEventAnalyticsProcedure,
  }),
});

export type AppRouter = typeof appRouter;
