import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { trpc } from '@/lib/trpc';
import { Notification, NotificationSettings } from '@/types';

const SETTINGS_KEY = 'notification_settings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const { user, token, isAuthenticated } = useAuth();
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

  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  const notificationsQuery = trpc.notifications.list.useQuery(
    { token: token || '' },
    { enabled: isAuthenticated && !!token, refetchInterval: 30000 }
  );

  const registerTokenMutation = trpc.notifications.registerToken.useMutation();
  const markReadMutation = trpc.notifications.markRead.useMutation();
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation();

  const loadSettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored && user) {
        const parsed = JSON.parse(stored);
        setSettings({ ...parsed, userId: user.id });
      } else if (user) {
        setSettings(prev => ({ ...prev, userId: user.id }));
      }
    } catch (error) {
      console.log('Error loading notification settings:', error);
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
    if (Platform.OS === 'web') {
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
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.log('Error saving notification settings:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.log('Push notifications not available on web');
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
      console.log('Error requesting notification permissions:', error);
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
      console.log('Demo notifications not available on web');
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
    requestPermissions,
    markAsRead,
    markAllAsRead,
    updateSettings,
    refetch: notificationsQuery.refetch,
    scheduleDemoNotification,
  };
});
