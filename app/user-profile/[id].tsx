import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  UserCircle,
  MapPin,
  Shield,
  Heart,
  Calendar,
  MessageCircle,
  Star,
  Ban,
  Flag,
  X,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  const statsQuery = trpc.ratings.getStats.useQuery(
    { creatorId: id || '' },
    { enabled: !!id }
  );

  const ratingsQuery = trpc.ratings.list.useQuery(
    { creatorId: id || '' },
    { enabled: !!id }
  );

  const blockMutation = trpc.blocking.block.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'User blocked');
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const reportMutation = trpc.blocking.report.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Report submitted. Thank you for helping keep our community safe.');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const profileData = user;
  const stats = statsQuery.data?.stats;
  const isOwnProfile = user?.id === id;

  const handleMessage = () => {
    if (!id) return;
    router.push(`/chat/${id}` as any);
  };

  const handleBlock = () => {
    if (!token || !id) return;
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? You will no longer see their events or receive messages from them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            blockMutation.mutate({ token, blockedId: id });
          },
        },
      ]
    );
  };

  const handleReport = () => {
    if (!token || !id || !reportReason.trim()) return;
    reportMutation.mutate({
      token,
      reportedId: id,
      reason: reportReason,
      description: reportDescription || undefined,
    });
  };

  const getInitials = () => {
    if (!profileData?.name) return '?';
    const parts = profileData.name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return profileData.name.substring(0, 2).toUpperCase();
  };

  const reportReasons = [
    'Inappropriate behavior',
    'Harassment',
    'Fake profile',
    'Spam',
    'Scam or fraud',
    'Other',
  ];

  if (!profileData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const profile = profileData.profile;
  const isCreator = profile?.role === 'creator';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Profile',
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
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            {profile?.photoUrl ? (
              <View style={styles.avatar}>
                <UserCircle size={80} color={Colors.coral} />
              </View>
            ) : (
              <LinearGradient
                colors={[Colors.coral, Colors.peach]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.initials}>{getInitials()}</Text>
              </LinearGradient>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{profileData.name}</Text>
            {isCreator && (
              <View style={styles.verifiedBadge}>
                <Shield size={18} color={Colors.coral} />
              </View>
            )}
          </View>

          <Text style={styles.age}>{profileData.age} years old</Text>

          {profile?.location && (
            <View style={styles.locationRow}>
              <MapPin size={16} color={Colors.text.secondary} />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          )}

          {isCreator && stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Star size={20} color={Colors.coral} fill={Colors.coral} />
                </View>
                <Text style={styles.statValue}>
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Calendar size={20} color={Colors.coral} />
                </View>
                <Text style={styles.statValue}>{stats.totalEvents}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <MessageCircle size={20} color={Colors.coral} />
                </View>
                <Text style={styles.statValue}>{stats.totalRatings}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
            </View>
          )}

          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={handleMessage}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.coral, Colors.peach]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.messageButtonGradient}
                >
                  <MessageCircle size={20} color={Colors.text.white} />
                  <Text style={styles.messageButtonText}>Message</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleBlock}
                activeOpacity={0.8}
              >
                <Ban size={20} color={Colors.text.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowReportModal(true)}
                activeOpacity={0.8}
              >
                <Flag size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {profile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          </View>
        )}

        {profile?.interests && profile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chipsContainer}>
              {profile.interests.map((interest) => (
                <View key={interest} style={styles.chip}>
                  <Text style={styles.chipText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile?.personalityTraits && profile.personalityTraits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personality</Text>
            <View style={styles.chipsContainer}>
              {profile.personalityTraits.map((trait) => (
                <View key={trait} style={styles.chip}>
                  <Text style={styles.chipText}>{trait}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile?.relationshipGoal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Looking For</Text>
            <View style={styles.card}>
              <Heart size={20} color={Colors.coral} />
              <Text style={styles.cardText}>
                {profile.relationshipGoal.charAt(0).toUpperCase() + profile.relationshipGoal.slice(1)}
              </Text>
            </View>
          </View>
        )}

        {isCreator && ratingsQuery.data?.ratings && ratingsQuery.data.ratings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {ratingsQuery.data.ratings.slice(0, 5).map((rating) => (
              <View key={rating.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>
                    {rating.reviewer?.name || 'Anonymous'}
                  </Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        color={star <= rating.rating ? Colors.coral : Colors.border.light}
                        fill={star <= rating.rating ? Colors.coral : 'transparent'}
                      />
                    ))}
                  </View>
                </View>
                {rating.review && (
                  <Text style={styles.reviewText}>{rating.review}</Text>
                )}
                {rating.event && (
                  <Text style={styles.reviewEvent}>Event: {rating.event.title}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowReportModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report User</Text>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Reason *</Text>
              {reportReasons.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonOption,
                    reportReason === reason && styles.reasonOptionActive,
                  ]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      reportReason === reason && styles.reasonTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                Additional details (optional)
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Provide more information..."
                placeholderTextColor={Colors.text.secondary}
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!reportReason.trim() || reportMutation.isPending) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleReport}
                disabled={!reportReason.trim() || reportMutation.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: Colors.background.card,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  initials: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.text.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  verifiedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  age: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border.light,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  messageButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bioText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.coral,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipText: {
    color: Colors.text.white,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  reviewCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewEvent: {
    fontSize: 13,
    color: Colors.text.light,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  reasonOption: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonOptionActive: {
    borderColor: Colors.coral,
    backgroundColor: '#FFF0F0',
  },
  reasonText: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  reasonTextActive: {
    color: Colors.coral,
    fontWeight: '600' as const,
  },
  textArea: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: Colors.coral,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
});
