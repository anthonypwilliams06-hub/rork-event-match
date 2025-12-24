import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, CheckCircle, Info } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function RequestVerificationScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [photoUrl, setPhotoUrl] = useState('');

  const verificationStatusQuery = trpc.verification.status.useQuery(
    { token: token || '' },
    { enabled: !!token }
  );

  const requestMutation = trpc.verification.request.useMutation({
    onSuccess: () => {
      Alert.alert(
        'Verification Requested',
        'Your verification request has been submitted. We will review it within 24-48 hours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSubmit = () => {
    if (!token || !photoUrl.trim()) {
      Alert.alert('Error', 'Please provide a photo URL');
      return;
    }

    if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
      Alert.alert('Error', 'Please provide a valid photo URL');
      return;
    }

    Alert.alert(
      'Submit Verification',
      'Are you ready to submit your verification request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            requestMutation.mutate({
              token,
              photoUrl: photoUrl.trim(),
            });
          },
        },
      ]
    );
  };

  const status = verificationStatusQuery.data?.status || 'unverified';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Verification',
          headerStyle: {
            backgroundColor: Colors.background.card,
          },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[Colors.coral, Colors.peach]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <CheckCircle size={48} color={Colors.text.white} />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Get Verified</Text>
          <Text style={styles.subtitle}>
            Verified users are more trusted in our community
          </Text>

          {status === 'pending' && (
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Info size={20} color='#F59E0B' />
                <Text style={styles.statusTitle}>Verification Pending</Text>
              </View>
              <Text style={styles.statusText}>
                We&apos;re reviewing your verification request. This usually takes 24-48 hours.
              </Text>
            </View>
          )}

          {status === 'verified' && (
            <View style={[styles.statusCard, styles.statusCardSuccess]}>
              <View style={styles.statusHeader}>
                <CheckCircle size={20} color='#10B981' />
                <Text style={[styles.statusTitle, { color: '#10B981' }]}>
                  You&apos;re Verified!
                </Text>
              </View>
              <Text style={styles.statusText}>
                Your profile is verified. This badge will be displayed on your profile.
              </Text>
            </View>
          )}

          {status === 'rejected' && (
            <View style={[styles.statusCard, styles.statusCardError]}>
              <View style={styles.statusHeader}>
                <Info size={20} color='#EF4444' />
                <Text style={[styles.statusTitle, { color: '#EF4444' }]}>
                  Verification Rejected
                </Text>
              </View>
              <Text style={styles.statusText}>
                {verificationStatusQuery.data?.request?.reason ||
                  'Your verification request was rejected. Please try again with a clear selfie.'}
              </Text>
            </View>
          )}

          {status !== 'verified' && (
            <>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Requirements:</Text>
                <Text style={styles.infoText}>• Clear selfie showing your face</Text>
                <Text style={styles.infoText}>• Good lighting</Text>
                <Text style={styles.infoText}>• No filters or heavy editing</Text>
                <Text style={styles.infoText}>• Must match your profile photo</Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Photo URL *</Text>
                <Text style={styles.inputHint}>
                  Upload your photo to a service like Imgur and paste the URL here
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/your-photo.jpg"
                  placeholderTextColor={Colors.text.light}
                  value={photoUrl}
                  onChangeText={setPhotoUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {photoUrl.trim() && (
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!photoUrl.trim() || requestMutation.isPending) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!photoUrl.trim() || requestMutation.isPending}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.coral, Colors.peach]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Camera size={20} color={Colors.text.white} />
                  <Text style={styles.submitButtonText}>
                    {requestMutation.isPending
                      ? 'Submitting...'
                      : status === 'pending'
                      ? 'Resubmit Verification'
                      : 'Submit Verification'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statusCardSuccess: {
    backgroundColor: '#D1FAE5',
  },
  statusCardError: {
    backgroundColor: '#FEE2E2',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  statusText: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  inputHint: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: Colors.border.light,
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
});
