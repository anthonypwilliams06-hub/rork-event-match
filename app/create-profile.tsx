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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { UserCircle, MapPin, Heart, ArrowRight, Calendar } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { INTERESTS, PERSONALITY_TRAITS, DEALBREAKERS } from '@/constants/interests';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RelationshipGoal } from '@/types';
import { trackProfileCreated } from '@/lib/analytics';
import { logError } from '@/lib/sentry';

export default function CreateProfileScreen() {
  const router = useRouter();
  const { isLoading: authLoading, user: authUser, updateUser } = useAuth();
  const [role, setRole] = useState<'creator' | 'seeker' | null>(null);
  const [bio, setBio] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [selectedDealbreakers, setSelectedDealbreakers] = useState<string[]>([]);
  const [relationshipGoal, setRelationshipGoal] = useState<RelationshipGoal | null>(null);
  const [ageRangeMin, setAgeRangeMin] = useState<string>('');
  const [ageRangeMax, setAgeRangeMax] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const relationshipGoals: { value: RelationshipGoal; label: string; emoji: string }[] = [
    { value: 'casual', label: 'Casual Dating', emoji: '😊' },
    { value: 'serious', label: 'Serious Relationship', emoji: '💑' },
    { value: 'friendship', label: 'New Friends', emoji: '🤝' },
    { value: 'open', label: 'Open to Anything', emoji: '✨' },
  ];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else if (selectedInterests.length < 10) {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const toggleTrait = (trait: string) => {
    if (selectedTraits.includes(trait)) {
      setSelectedTraits(selectedTraits.filter(t => t !== trait));
    } else if (selectedTraits.length < 5) {
      setSelectedTraits([...selectedTraits, trait]);
    }
  };

  const toggleDealbreaker = (dealbreaker: string) => {
    if (selectedDealbreakers.includes(dealbreaker)) {
      setSelectedDealbreakers(selectedDealbreakers.filter(d => d !== dealbreaker));
    } else if (selectedDealbreakers.length < 5) {
      setSelectedDealbreakers([...selectedDealbreakers, dealbreaker]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!role) {
      newErrors.role = 'Please select your role';
    }

    if (!location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (selectedInterests.length === 0) {
      newErrors.interests = 'Select at least one interest';
    }

    if (selectedTraits.length === 0) {
      newErrors.traits = 'Select at least one personality trait';
    }

    if (role === 'seeker') {
      if (!ageRangeMin || !ageRangeMax) {
        newErrors.ageRange = 'Age range is required for seekers';
      } else {
        const min = parseInt(ageRangeMin);
        const max = parseInt(ageRangeMax);
        if (min < 18 || max < 18) {
          newErrors.ageRange = 'Age must be 18 or above';
        }
        if (min > max) {
          newErrors.ageRange = 'Min age cannot be greater than max age';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateProfile = async () => {
    if (!validateForm() || !role) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('Error', 'Database not configured');
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('No authenticated user');
      Alert.alert('Error', 'Authentication session not found. Please log in again.');
      router.replace('/login' as any);
      return;
    }

    setIsLoading(true);
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        Alert.alert('Error', 'Profile already exists');
        setIsLoading(false);
        return;
      }

      const profileData = {
        user_id: user.id,
        role,
        bio: bio.trim() || null,
        interests: selectedInterests,
        personality_traits: selectedTraits,
        dealbreakers: selectedDealbreakers,
        relationship_goal: relationshipGoal || null,
        location,
        age_range_min: role === 'seeker' && ageRangeMin ? parseInt(ageRangeMin) : null,
        age_range_max: role === 'seeker' && ageRangeMax ? parseInt(ageRangeMax) : null,
      };

      const { error } = await supabase
        .from('profiles')
        .insert(profileData);

      if (error) {
        console.error('Profile creation error:', error);
        throw new Error(error.message);
      }

      console.log('Profile created successfully');
      trackProfileCreated(user.id, false, selectedInterests.length);

      if (authUser) {
        updateUser({
          ...authUser,
          profile: {
            userId: user.id,
            role,
            bio: bio.trim() || undefined,
            interests: selectedInterests,
            personalityTraits: selectedTraits,
            dealbreakers: selectedDealbreakers,
            relationshipGoal: relationshipGoal || undefined,
            location,
            ageRangeMin: role === 'seeker' && ageRangeMin ? parseInt(ageRangeMin) : undefined,
            ageRangeMax: role === 'seeker' && ageRangeMax ? parseInt(ageRangeMax) : undefined,
            verificationStatus: 'unverified',
          },
        });
      }

      router.replace('/' as any);
    } catch (error: any) {
      console.error('Create profile error:', error);
      logError(error instanceof Error ? error : new Error('Profile creation failed'), { userId: user.id });
      Alert.alert('Error', error?.message || 'Failed to create profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
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
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[Colors.coral, Colors.peach]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <UserCircle size={32} color={Colors.text.white} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Create Your Profile</Text>
            <Text style={styles.subtitle}>
              Tell us about yourself
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>I&apos;m a...</Text>
              {errors.role ? (
                <Text style={styles.errorText}>{errors.role}</Text>
              ) : null}
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[styles.roleCard, role === 'creator' && styles.roleCardActive]}
                  onPress={() => {
                    setRole('creator');
                    setErrors({ ...errors, role: '' });
                  }}
                  activeOpacity={0.7}
                >
                  <Calendar size={32} color={role === 'creator' ? Colors.coral : Colors.text.secondary} />
                  <Text style={[styles.roleTitle, role === 'creator' && styles.roleTextActive]}>
                    Event Creator
                  </Text>
                  <Text style={styles.roleDescription}>
                    Host events and meet people
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleCard, role === 'seeker' && styles.roleCardActive]}
                  onPress={() => {
                    setRole('seeker');
                    setErrors({ ...errors, role: '' });
                  }}
                  activeOpacity={0.7}
                >
                  <Heart size={32} color={role === 'seeker' ? Colors.coral : Colors.text.secondary} />
                  <Text style={[styles.roleTitle, role === 'seeker' && styles.roleTextActive]}>
                    Event Seeker
                  </Text>
                  <Text style={styles.roleDescription}>
                    Browse events and connect
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={[styles.inputWrapper, errors.location && styles.inputError]}>
                <MapPin size={20} color={errors.location ? '#FF3B30' : Colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="City, State"
                  placeholderTextColor={Colors.text.secondary}
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
                    if (errors.location) {
                      setErrors({ ...errors, location: '' });
                    }
                  }}
                />
              </View>
              {errors.location ? (
                <Text style={styles.errorText}>{errors.location}</Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bio (Optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Tell us about yourself..."
                placeholderTextColor={Colors.text.secondary}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests (Select up to 10)</Text>
              {errors.interests ? (
                <Text style={styles.errorText}>{errors.interests}</Text>
              ) : null}
              <Text style={styles.selectionCount}>{selectedInterests.length}/10 selected</Text>
              <View style={styles.chipsContainer}>
                {INTERESTS.map((interest) => (
                  <TouchableOpacity
                    key={interest}
                    style={[
                      styles.chip,
                      selectedInterests.includes(interest) && styles.chipActive,
                    ]}
                    onPress={() => toggleInterest(interest)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedInterests.includes(interest) && styles.chipTextActive,
                      ]}
                    >
                      {interest}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personality Traits (Select up to 5)</Text>
              {errors.traits ? (
                <Text style={styles.errorText}>{errors.traits}</Text>
              ) : null}
              <Text style={styles.selectionCount}>{selectedTraits.length}/5 selected</Text>
              <View style={styles.chipsContainer}>
                {PERSONALITY_TRAITS.map((trait) => (
                  <TouchableOpacity
                    key={trait}
                    style={[
                      styles.chip,
                      selectedTraits.includes(trait) && styles.chipActive,
                    ]}
                    onPress={() => toggleTrait(trait)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedTraits.includes(trait) && styles.chipTextActive,
                      ]}
                    >
                      {trait}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dealbreakers (Optional, up to 5)</Text>
              <Text style={styles.selectionCount}>{selectedDealbreakers.length}/5 selected</Text>
              <View style={styles.chipsContainer}>
                {DEALBREAKERS.map((dealbreaker) => (
                  <TouchableOpacity
                    key={dealbreaker}
                    style={[
                      styles.chip,
                      selectedDealbreakers.includes(dealbreaker) && styles.chipActive,
                    ]}
                    onPress={() => toggleDealbreaker(dealbreaker)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedDealbreakers.includes(dealbreaker) && styles.chipTextActive,
                      ]}
                    >
                      {dealbreaker}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Looking For (Optional)</Text>
              <View style={styles.goalContainer}>
                {relationshipGoals.map((goal) => (
                  <TouchableOpacity
                    key={goal.value}
                    style={[
                      styles.goalCard,
                      relationshipGoal === goal.value && styles.goalCardActive,
                    ]}
                    onPress={() => setRelationshipGoal(goal.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                    <Text
                      style={[
                        styles.goalText,
                        relationshipGoal === goal.value && styles.goalTextActive,
                      ]}
                    >
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {role === 'seeker' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferred Age Range</Text>
                {errors.ageRange ? (
                  <Text style={styles.errorText}>{errors.ageRange}</Text>
                ) : null}
                <View style={styles.ageRangeContainer}>
                  <View style={styles.ageInput}>
                    <Text style={styles.ageLabel}>Min</Text>
                    <TextInput
                      style={styles.ageTextInput}
                      placeholder="18"
                      placeholderTextColor={Colors.text.secondary}
                      value={ageRangeMin}
                      onChangeText={(text) => {
                        setAgeRangeMin(text.replace(/[^0-9]/g, ''));
                        if (errors.ageRange) {
                          setErrors({ ...errors, ageRange: '' });
                        }
                      }}
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
                      value={ageRangeMax}
                      onChangeText={(text) => {
                        setAgeRangeMax(text.replace(/[^0-9]/g, ''));
                        if (errors.ageRange) {
                          setErrors({ ...errors, ageRange: '' });
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.createButton, isLoading && styles.buttonDisabled]}
              onPress={handleCreateProfile}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[Colors.coral, Colors.peach]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.createButtonText}>Complete Profile</Text>
                <ArrowRight size={20} color={Colors.text.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    gap: 28,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roleCardActive: {
    borderColor: Colors.coral,
    backgroundColor: '#FFF0F0',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  roleTextActive: {
    color: Colors.coral,
  },
  roleDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    height: 56,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
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
  textArea: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 100,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: -4,
  },
  selectionCount: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: -4,
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
    borderColor: Colors.coral,
  },
  chipText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500' as const,
  },
  chipTextActive: {
    color: Colors.text.white,
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
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  createButton: {
    marginTop: 12,
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
  createButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
});
