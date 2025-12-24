import * as Sentry from '@sentry/react-native';

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: !__DEV__,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
    beforeSend(event) {
      if (__DEV__) {
        console.log('[Sentry] Event:', event);
        return null;
      }
      return event;
    },
  });
};

export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('[Error]', error.message, context);
  
  if (!__DEV__) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
};

export const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
  console.log(`[${level.toUpperCase()}]`, message, context);
  
  if (!__DEV__) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }
};

export const setUser = (userId: string, email?: string) => {
  Sentry.setUser({
    id: userId,
    email,
  });
};

export const clearUser = () => {
  Sentry.setUser(null);
};

export { Sentry };
