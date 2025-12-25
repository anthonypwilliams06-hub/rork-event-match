import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { storage } from '@/lib/storage';
import { useAuth } from './AuthContext';
import { trpc } from '@/lib/trpc';
import { Notification, NotificationSettings } from '@/types';

const SETTINGS_KEY = 'notification_settings';

let Notifications: typeof import('expo-notifications') | null = null;
let notificationsAvailable = false;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    notificationsAvailable = true;
    
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.log('[Notifications] expo-notifications not available:', error);
    notificationsAvailable = false;
  }
}

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [settings, setSettings] = useState<NotificationSettings>({
    userId: '',
    newMessages: true,
    profileLikes: true,
    eventReminders: true,
    messageReplies: true,
    eventFillingUp: true,
    pushEnabled: false,
  });

  const notificationListener = useRef<any>(undefined);
  const responseListener = useRef<any>(undefined);

  const notificationsQuery = trpc.notifications.list.useQuery(
    { token: token || '' },
    { 
      enabled: !authLoading && isAuthenticated && !!token, 
      refetchInterval: 30000,
      retry: 1,
      select: (data) => data || [],
    }
  );

  const registerTokenMutation = trpc.notifications.registerToken.useMutation();
  const markReadMutation = trpc.notifications.markRead.useMutation();
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation();

  const loadSettings = useCallback(async () => {
    try {
      const stored = await storage.getItem(SETTINGS_KEY);
      if (stored && user) {
        const parsed = JSON.parse(stored);
        setSettings({ ...parsed, userId: user.id });
      } else if (user) {
        setSettings(prev => ({ ...prev, userId: user.id }));
      }
    } catch (error) {
      console.warn('[Notifications] Error loading settings:', error);
      if (user) {
        setSettings(prev => ({ ...prev, userId: user.id }));
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  useEffect(() => {
    if (notificationsQuery.data) {
      const unread = notificationsQuery.data.filter((n: Notification) => !n.read).length;
      setUnreadCount(unread);
    }
  }, [notificationsQuery.data]);

  useEffect(() => {
    if (Platform.OS === 'web' || !notificationsAvailable || !Notifications) {
      return;
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      notificationsQuery.refetch();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [notificationsQuery]);

  const saveSettings = async (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    
    try {
      await storage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.warn('[Notifications] Error saving settings:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Push notifications not available on web');
      return false;
    }

    if (!notificationsAvailable || !Notifications) {
      console.log('[Notifications] expo-notifications not available (requires development build)');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission to send notifications was denied');
        setPermissionStatus('denied');
        return false;
      }

      setPermissionStatus('granted');

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '5pl4q37ca017h70cdb6zk',
      });
      const pushToken = tokenData.data;
      setExpoPushToken(pushToken);

      if (isAuthenticated && token) {
        await registerTokenMutation.mutateAsync({ sessionToken: token, pushToken });
      }

      await saveSettings({ ...settings, pushEnabled: true });

      console.log('Push token registered:', pushToken);
      return true;
    } catch (error) {
      console.log('[Notifications] Error requesting notification permissions:', error);
      setPermissionStatus('denied');
      return false;
    }
  };

  const handleNotificationTap = (data: any) => {
    console.log('Handle notification tap with data:', data);
  };

  const markAsRead = async (notificationId: string) => {
    if (!token) return;
    
    try {
      await markReadMutation.mutateAsync({ token, notificationId });
      await notificationsQuery.refetch();
    } catch (error) {
      console.log('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    
    try {
      await markAllReadMutation.mutateAsync({ token });
      await notificationsQuery.refetch();
    } catch (error) {
      console.log('Error marking all notifications as read:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    await saveSettings(updated);
  };

  const scheduleDemoNotification = async () => {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Demo notifications not available on web');
      return;
    }

    if (!notificationsAvailable || !Notifications) {
      console.log('[Notifications] expo-notifications not available (requires development build)');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New Message!",
        body: 'John sent you a message',
        data: { senderId: 'demo-user' },
      },
      trigger: null,
    });
  };

  return {
    expoPushToken,
    permissionStatus,
    notifications: notificationsQuery.data || [],
    unreadCount,
    settings,
    isLoading: notificationsQuery.isLoading,
    notificationsAvailable,
    requestPermissions,
    markAsRead,
    markAllAsRead,
    updateSettings,
    refetch: notificationsQuery.refetch,
    scheduleDemoNotification,
  };
});
