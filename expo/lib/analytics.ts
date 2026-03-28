import { Platform } from 'react-native';
import { logMessage } from './sentry';

type AnalyticsEvent = 
  | { type: 'signup_started'; properties: { method: 'email' } }
  | { type: 'signup_completed'; properties: { userId: string; method: 'email' } }
  | { type: 'signup_failed'; properties: { error: string; step: string } }
  | { type: 'login_started'; properties: { method: 'email' } }
  | { type: 'login_completed'; properties: { userId: string } }
  | { type: 'login_failed'; properties: { error: string } }
  | { type: 'profile_created'; properties: { userId: string; hasPhoto: boolean; interestCount: number } }
  | { type: 'event_created'; properties: { eventId: string; eventType: string; hasLocation: boolean } }
  | { type: 'event_creation_failed'; properties: { error: string } }
  | { type: 'rsvp_submitted'; properties: { eventId: string; status: string } }
  | { type: 'rsvp_failed'; properties: { eventId: string; error: string } }
  | { type: 'message_sent'; properties: { recipientId: string; conversationExists: boolean } }
  | { type: 'message_failed'; properties: { recipientId: string; error: string } }
  | { type: 'screen_viewed'; properties: { screen: string } }
  | { type: 'event_viewed'; properties: { eventId: string } }
  | { type: 'profile_viewed'; properties: { profileId: string } }
  | { type: 'search_performed'; properties: { filters: string } }
  | { type: 'favorite_added'; properties: { eventId: string } }
  | { type: 'user_blocked'; properties: { blockedUserId: string } }
  | { type: 'report_submitted'; properties: { type: 'user' | 'event'; targetId: string } };

interface AnalyticsStore {
  events: {
    event: AnalyticsEvent;
    timestamp: string;
    platform: string;
  }[];
}

const store: AnalyticsStore = {
  events: [],
};

export const trackEvent = (event: AnalyticsEvent) => {
  const eventData = {
    event,
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
  };

  store.events.push(eventData);

  console.log('[Analytics]', event.type, event.properties);

  logMessage(`Analytics: ${event.type}`, 'info', {
    ...event.properties,
    platform: Platform.OS,
  });

  if (store.events.length > 1000) {
    store.events = store.events.slice(-500);
  }
};

export const trackSignupStarted = () => {
  trackEvent({ type: 'signup_started', properties: { method: 'email' } });
};

export const trackSignupCompleted = (userId: string) => {
  trackEvent({ type: 'signup_completed', properties: { userId, method: 'email' } });
};

export const trackSignupFailed = (error: string, step: string) => {
  trackEvent({ type: 'signup_failed', properties: { error, step } });
};

export const trackLoginStarted = () => {
  trackEvent({ type: 'login_started', properties: { method: 'email' } });
};

export const trackLoginCompleted = (userId: string) => {
  trackEvent({ type: 'login_completed', properties: { userId } });
};

export const trackLoginFailed = (error: string) => {
  trackEvent({ type: 'login_failed', properties: { error } });
};

export const trackProfileCreated = (userId: string, hasPhoto: boolean, interestCount: number) => {
  trackEvent({ type: 'profile_created', properties: { userId, hasPhoto, interestCount } });
};

export const trackEventCreated = (eventId: string, eventType: string, hasLocation: boolean) => {
  trackEvent({ type: 'event_created', properties: { eventId, eventType, hasLocation } });
};

export const trackEventCreationFailed = (error: string) => {
  trackEvent({ type: 'event_creation_failed', properties: { error } });
};

export const trackRSVPSubmitted = (eventId: string, status: string) => {
  trackEvent({ type: 'rsvp_submitted', properties: { eventId, status } });
};

export const trackRSVPFailed = (eventId: string, error: string) => {
  trackEvent({ type: 'rsvp_failed', properties: { eventId, error } });
};

export const trackMessageSent = (recipientId: string, conversationExists: boolean) => {
  trackEvent({ type: 'message_sent', properties: { recipientId, conversationExists } });
};

export const trackMessageFailed = (recipientId: string, error: string) => {
  trackEvent({ type: 'message_failed', properties: { recipientId, error } });
};

export const trackScreenViewed = (screen: string) => {
  trackEvent({ type: 'screen_viewed', properties: { screen } });
};

export const trackEventViewed = (eventId: string) => {
  trackEvent({ type: 'event_viewed', properties: { eventId } });
};

export const trackProfileViewed = (profileId: string) => {
  trackEvent({ type: 'profile_viewed', properties: { profileId } });
};

export const getAnalyticsSummary = () => {
  const summary = {
    totalEvents: store.events.length,
    signupConversion: {
      started: store.events.filter(e => e.event.type === 'signup_started').length,
      completed: store.events.filter(e => e.event.type === 'signup_completed').length,
      failed: store.events.filter(e => e.event.type === 'signup_failed').length,
    },
    eventCreation: {
      created: store.events.filter(e => e.event.type === 'event_created').length,
      failed: store.events.filter(e => e.event.type === 'event_creation_failed').length,
    },
    rsvp: {
      submitted: store.events.filter(e => e.event.type === 'rsvp_submitted').length,
      failed: store.events.filter(e => e.event.type === 'rsvp_failed').length,
    },
    messages: {
      sent: store.events.filter(e => e.event.type === 'message_sent').length,
      failed: store.events.filter(e => e.event.type === 'message_failed').length,
    },
  };

  return summary;
};

export const exportAnalytics = () => {
  return JSON.stringify(store.events, null, 2);
};
