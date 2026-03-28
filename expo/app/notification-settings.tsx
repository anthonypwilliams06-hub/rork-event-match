import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, MessageSquare, Heart, Calendar, Users, CheckCircle } from 'lucide-react-native';
import { useNotifications } from '@/contexts/NotificationContext';

export default function NotificationSettingsScreen() {
  const {
    settings,
    permissionStatus,
    requestPermissions,
    updateSettings,
    scheduleDemoNotification,
  } = useNotifications();

  const [localSettings, setLocalSettings] = useState(settings);

  const handleToggle = (key: keyof typeof localSettings) => {
    const newValue = !localSettings[key];
    const updated = { ...localSettings, [key]: newValue };
    setLocalSettings(updated);
    updateSettings({ [key]: newValue });
  };

  const handleEnablePushNotifications = async () => {
    const granted = await requestPermissions();
    if (granted) {
      Alert.alert(
        'Success',
        'Push notifications enabled! You will now receive notifications.'
      );
    } else {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your device settings to receive push notifications.'
      );
    }
  };

  const handleTestNotification = () => {
    scheduleDemoNotification();
    Alert.alert(
      'Test Notification Sent',
      'You should receive a test notification in a few seconds'
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notification Settings',
          headerStyle: { backgroundColor: '#FF6B6B' },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Bell size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Enable Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive real-time notifications on your device
                </Text>
              </View>
            </View>
            {permissionStatus === 'granted' ? (
              <CheckCircle size={24} color="#4CAF50" />
            ) : (
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleEnablePushNotifications}
              >
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>
          {permissionStatus === 'granted' && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestNotification}
            >
              <Text style={styles.testButtonText}>Send Test Notification</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MessageSquare size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>New Messages</Text>
                <Text style={styles.settingDescription}>
                  When someone sends you a message
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings.newMessages}
              onValueChange={() => handleToggle('newMessages')}
              trackColor={{ false: '#DDD', true: '#FFB3B3' }}
              thumbColor={localSettings.newMessages ? '#FF6B6B' : '#FFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Heart size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Profile Likes</Text>
                <Text style={styles.settingDescription}>
                  When someone likes your profile
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings.profileLikes}
              onValueChange={() => handleToggle('profileLikes')}
              trackColor={{ false: '#DDD', true: '#FFB3B3' }}
              thumbColor={localSettings.profileLikes ? '#FF6B6B' : '#FFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Calendar size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Event Reminders</Text>
                <Text style={styles.settingDescription}>
                  Reminders for upcoming events
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings.eventReminders}
              onValueChange={() => handleToggle('eventReminders')}
              trackColor={{ false: '#DDD', true: '#FFB3B3' }}
              thumbColor={localSettings.eventReminders ? '#FF6B6B' : '#FFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MessageSquare size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Message Replies</Text>
                <Text style={styles.settingDescription}>
                  When someone replies to your message
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings.messageReplies}
              onValueChange={() => handleToggle('messageReplies')}
              trackColor={{ false: '#DDD', true: '#FFB3B3' }}
              thumbColor={localSettings.messageReplies ? '#FF6B6B' : '#FFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Users size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Event Capacity Alerts</Text>
                <Text style={styles.settingDescription}>
                  When events are filling up or full
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings.eventFillingUp}
              onValueChange={() => handleToggle('eventFillingUp')}
              trackColor={{ false: '#DDD', true: '#FFB3B3' }}
              thumbColor={localSettings.eventFillingUp ? '#FF6B6B' : '#FFF'}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  enableButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  enableButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
});
