import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { 
  UserCircle, 
  MapPin, 
  Edit2, 
  Check, 
  X,
  Shield,
  Heart,
  Calendar,
  Camera,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { INTERESTS, PERSONALITY_TRAITS } from '@/constants/interests';
import { useAuth } from '@/contexts/AuthContext';
import { trpcClient } from '@/lib/trpc';
import { RelationshipGoal } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const profile = user?.profile;
  const isCreator = profile?.role === 'creator';

  const [editedBio, setEditedBio] = useState<string>(profile?.bio || '');
  const [editedLocation, setEditedLocation] = useState<string>(profile?.location || '');
  const [editedInterests, setEditedInterests] = useState<string[]>(profile?.interests || []);
  const [editedTraits, setEditedTraits] = useState<string[]>(profile?.personalityTraits || []);
  const [editedGoal, setEditedGoal] = useState<RelationshipGoal | undefined>(profile?.relationshipGoal);
  const [editedAgeMin, setEditedAgeMin] = useState<string>(profile?.ageRangeMin?.toString() || '');
  const [editedAgeMax, setEditedAgeMax] = useState<string>(profile?.ageRangeMax?.toString() || '');
  const [editedPhotoUrl, setEditedPhotoUrl] = useState<string | undefined>(profile?.photoUrl);

  const relationshipGoals: { value: RelationshipGoal; label: string; emoji: string }[] = [
    { value: 'casual', label: 'Casual Dating', emoji: '😊' },
    { value: 'serious', label: 'Serious Relationship', emoji: '💑' },
    { value: 'friendship', label: 'New Friends', emoji: '🤝' },
    { value: 'open', label: 'Open to Anything', emoji: '✨' },
  ];

  const completeness = React.useMemo(() => {
    if (!profile) return 0;
    let score = 0;
    const total = isCreator ? 8 : 7;

    if (profile.bio) score++;
    if (profile.photoUrl) score++;
    if (profile.location) score++;
    if (profile.interests.length > 0) score++;
    if (profile.personalityTraits.length > 0) score++;
    if (profile.relationshipGoal) score++;
    if (!isCreator && profile.ageRangeMin && profile.ageRangeMax) score++;

    return Math.round((score / total) * 100);
  }, [profile, isCreator]);

  const toggleInterest = (interest: string) => {
    if (editedInterests.includes(interest)) {
      setEditedInterests(editedInterests.filter(i => i !== interest));
    } else if (editedInterests.length < 10) {
      setEditedInterests([...editedInterests, interest]);
    }
  };

  const toggleTrait = (trait: string) => {
    if (editedTraits.includes(trait)) {
      setEditedTraits(editedTraits.filter(t => t !== trait));
    } else if (editedTraits.length < 10) {
      setEditedTraits([...editedTraits, trait]);
    }
  };

  const handleEdit = () => {
    setEditedBio(profile?.bio || '');
    setEditedLocation(profile?.location || '');
    setEditedInterests(profile?.interests || []);
    setEditedTraits(profile?.personalityTraits || []);
    setEditedGoal(profile?.relationshipGoal);
    setEditedAgeMin(profile?.ageRangeMin?.toString() || '');
    setEditedAgeMax(profile?.ageRangeMax?.toString() || '');
    setEditedPhotoUrl(profile?.photoUrl);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase || !user) {
      Alert.alert('Error', 'Image upload not available');
      return null;
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        const imageUri = result.assets[0].uri;
        
        const uploadedUrl = await uploadImageToSupabase(imageUri);
        
        if (uploadedUrl) {
          setEditedPhotoUrl(uploadedUrl);
          Alert.alert('Success', 'Photo uploaded successfully');
        } else {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        }
        
        setIsUploadingImage(false);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!token || !profile) return;

    setIsLoading(true);
    try {
      const result = await trpcClient.profile.update.mutate({
        token,
        bio: editedBio.trim() || undefined,
        location: editedLocation.trim(),
        interests: editedInterests,
        personalityTraits: editedTraits,
        relationshipGoal: editedGoal,
        ageRangeMin: !isCreator && editedAgeMin ? parseInt(editedAgeMin) : undefined,
        ageRangeMax: !isCreator && editedAgeMax ? parseInt(editedAgeMax) : undefined,
        photoUrl: editedPhotoUrl,
      });

      if (user && result.profile) {
        updateUser({ ...user, profile: result.profile });
      }

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    if (!user?.name) return '?';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const getCompletenessColor = () => {
    if (completeness >= 80) return '#34C759';
    if (completeness >= 50) return '#FF9500';
    return '#FF3B30';
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <UserCircle size={64} color={Colors.text.secondary} />
          <Text style={styles.emptyText}>No profile found</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/create-profile' as any)}
          >
            <Text style={styles.createButtonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {(editedPhotoUrl || profile.photoUrl) ? (
                <Image 
                  source={{ uri: editedPhotoUrl || profile.photoUrl }} 
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
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
              
              {isEditing && (
                <TouchableOpacity 
                  style={styles.cameraButton} 
                  activeOpacity={0.7}
                  onPress={handlePickImage}
                  disabled={isUploadingImage}
                >
                  <LinearGradient
                    colors={[Colors.coral, Colors.peach]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cameraGradient}
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color={Colors.text.white} />
                    ) : (
                      <Camera size={18} color={Colors.text.white} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{user?.name}</Text>
                {isCreator && (
                  <View style={styles.verifiedBadge}>
                    <Shield size={18} color={Colors.coral} />
                  </View>
                )}
              </View>
              <Text style={styles.age}>{user?.age} years old</Text>
              <View style={styles.roleTag}>
                {isCreator ? (
                  <Calendar size={16} color={Colors.coral} />
                ) : (
                  <Heart size={16} color={Colors.coral} />
                )}
                <Text style={styles.roleText}>
                  {isCreator ? 'Event Creator' : 'Event Seeker'}
                </Text>
              </View>
            </View>

            {!isEditing && (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Edit2 size={20} color={Colors.coral} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.completenessCard}>
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessTitle}>Profile Completeness</Text>
              <Text style={[styles.completenessPercent, { color: getCompletenessColor() }]}>
                {completeness}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${completeness}%`, backgroundColor: getCompletenessColor() }
                ]} 
              />
            </View>
            {completeness < 100 && (
              <Text style={styles.completenessHint}>
                Complete your profile to increase visibility
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {isEditing ? (
              <View style={styles.inputWrapper}>
                <MapPin size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="City, State"
                  placeholderTextColor={Colors.text.secondary}
                  value={editedLocation}
                  onChangeText={setEditedLocation}
                />
              </View>
            ) : (
              <View style={styles.infoCard}>
                <MapPin size={20} color={Colors.coral} />
                <Text style={styles.infoText}>{profile.location}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bio</Text>
              {isEditing && (
                <Text style={styles.charCount}>{editedBio.length}/500</Text>
              )}
            </View>
            {isEditing ? (
              <TextInput
                style={styles.textArea}
                placeholder="Tell us about yourself..."
                placeholderTextColor={Colors.text.secondary}
                value={editedBio}
                onChangeText={(text) => {
                  if (text.length <= 500) {
                    setEditedBio(text);
                  }
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.bioText}>
                  {profile.bio || 'No bio added yet'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Interests ({isEditing ? `${editedInterests.length}/10` : editedInterests.length})
            </Text>
            {isEditing ? (
              <View style={styles.chipsContainer}>
                {INTERESTS.map((interest) => (
                  <TouchableOpacity
                    key={interest}
                    style={[
                      styles.chip,
                      editedInterests.includes(interest) && styles.chipActive,
                    ]}
                    onPress={() => toggleInterest(interest)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        editedInterests.includes(interest) && styles.chipTextActive,
                      ]}
                    >
                      {interest}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.chipsContainer}>
                {profile.interests.map((interest) => (
                  <View key={interest} style={styles.chipActive}>
                    <Text style={styles.chipTextActive}>{interest}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Personality Traits ({isEditing ? `${editedTraits.length}/10` : editedTraits.length})
            </Text>
            {isEditing ? (
              <View style={styles.chipsContainer}>
                {PERSONALITY_TRAITS.map((trait) => (
                  <TouchableOpacity
                    key={trait}
                    style={[
                      styles.chip,
                      editedTraits.includes(trait) && styles.chipActive,
                    ]}
                    onPress={() => toggleTrait(trait)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        editedTraits.includes(trait) && styles.chipTextActive,
                      ]}
                    >
                      {trait}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.chipsContainer}>
                {profile.personalityTraits.map((trait) => (
                  <View key={trait} style={styles.chipActive}>
                    <Text style={styles.chipTextActive}>{trait}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Looking For</Text>
            {isEditing ? (
              <View style={styles.goalContainer}>
                {relationshipGoals.map((goal) => (
                  <TouchableOpacity
                    key={goal.value}
                    style={[
                      styles.goalCard,
                      editedGoal === goal.value && styles.goalCardActive,
                    ]}
                    onPress={() => setEditedGoal(goal.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                    <Text
                      style={[
                        styles.goalText,
                        editedGoal === goal.value && styles.goalTextActive,
                      ]}
                    >
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.goalEmoji}>
                  {relationshipGoals.find(g => g.value === profile.relationshipGoal)?.emoji || '✨'}
                </Text>
                <Text style={styles.infoText}>
                  {relationshipGoals.find(g => g.value === profile.relationshipGoal)?.label || 'Not specified'}
                </Text>
              </View>
            )}
          </View>

          {!isCreator && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferred Age Range</Text>
              {isEditing ? (
                <View style={styles.ageRangeContainer}>
                  <View style={styles.ageInput}>
                    <Text style={styles.ageLabel}>Min</Text>
                    <TextInput
                      style={styles.ageTextInput}
                      placeholder="18"
                      placeholderTextColor={Colors.text.secondary}
                      value={editedAgeMin}
                      onChangeText={(text) => setEditedAgeMin(text.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.ageSeparator}>-</Text>
                  <View style={styles.ageInput}>
                    <Text style={styles.ageLabel}>Max</Text>
                    <TextInput
                      style={styles.ageTextInput}
                      placeholder="99"
                      placeholderTextColor={Colors.text.secondary}
                      value={editedAgeMax}
                      onChangeText={(text) => setEditedAgeMax(text.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>
                    {profile.ageRangeMin} - {profile.ageRangeMax} years old
                  </Text>
                </View>
              )}
            </View>
          )}

          {isEditing && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.text.secondary} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.buttonDisabled]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[Colors.coral, Colors.peach]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Check size={20} color={Colors.text.white} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text.secondary,
  },
  createButton: {
    backgroundColor: Colors.coral,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
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
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.background.card,
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
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cameraGradient: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 24,
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
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.coral,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  completenessCard: {
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
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completenessTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  completenessPercent: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completenessHint: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  charCount: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.coral,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    height: '100%',
  },
  infoCard: {
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
  infoText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  textArea: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.coral,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 100,
  },
  bioText: {
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipActive: {
    backgroundColor: Colors.coral,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500' as const,
  },
  chipTextActive: {
    color: Colors.text.white,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  goalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardActive: {
    borderColor: Colors.coral,
    backgroundColor: '#FFF0F0',
  },
  goalEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  goalTextActive: {
    color: Colors.coral,
  },
  ageRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ageInput: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.coral,
  },
  ageLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  ageTextInput: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'center',
    minWidth: 50,
  },
  ageSeparator: {
    fontSize: 24,
    color: Colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
