import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Calendar,
  MapPin,
  Image as ImageIcon,
  X,
  Check,
  ChevronLeft,
  Upload,
  Users,
  Save,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { EVENT_CATEGORIES } from '@/constants/interests';
import { EventCategory } from '@/types';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [capacity, setCapacity] = useState('');

  const createEventMutation = trpc.events.create.useMutation();

  const totalSteps = 3;

  const handleNext = () => {
    if (step === 1) {
      if (!title.trim()) {
        Alert.alert('Required', 'Please enter an event title');
        return;
      }
      if (!category) {
        Alert.alert('Required', 'Please select a category');
        return;
      }
    }
    
    if (step === 2) {
      if (!description.trim()) {
        Alert.alert('Required', 'Please enter an event description');
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreate = async (isDraft: boolean) => {
    if (!location.trim()) {
      Alert.alert('Required', 'Please enter a location');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create an event');
      return;
    }

    const eventData = {
      title,
      description,
      category: category!,
      date: selectedDate,
      time: selectedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      location,
      imageUrl: imageUri || imageUrl || 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&h=600&fit=crop',
      capacity: capacity ? parseInt(capacity) : undefined,
      isDraft,
      creatorId: user.id,
    };

    try {
      await createEventMutation.mutateAsync(eventData);
      Alert.alert(
        'Success!',
        isDraft ? 'Your event draft has been saved' : 'Your event has been created',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create event. Please try again.');
      console.error('Error creating event:', error);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[
            styles.progressStep,
            s <= step && styles.progressStepActive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Info</Text>
      <Text style={styles.stepSubtitle}>Tell us about your event</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Coffee & Conversation"
          placeholderTextColor={Colors.text.light}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoriesGrid}>
          {EVENT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                category === cat.id && styles.categoryChipSelected,
              ]}
              onPress={() => setCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryText,
                  category === cat.id && styles.categoryTextSelected,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Details</Text>
      <Text style={styles.stepSubtitle}>Describe your event</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What will you do? Who are you looking for?"
          placeholderTextColor={Colors.text.light}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Photo (Optional)</Text>
        
        {imageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImageUri(null)}
              activeOpacity={0.7}
            >
              <X size={16} color={Colors.text.white} />
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handlePickImage}
          activeOpacity={0.7}
        >
          <Upload size={20} color={Colors.coral} />
          <Text style={styles.uploadButtonText}>
            {imageUri ? 'Change Photo' : 'Upload Photo'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.hint}>Or enter an image URL</Text>
        <View style={styles.imageInputContainer}>
          <ImageIcon size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.imageInput}
            placeholder="https://..."
            placeholderTextColor={Colors.text.light}
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>When & Where</Text>
      <Text style={styles.stepSubtitle}>Set the time and place</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date *</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Calendar size={20} color={Colors.text.secondary} />
          <Text style={styles.datePickerButtonText}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setSelectedDate(date);
            }}
            minimumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Time *</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowTimePicker(true)}
          activeOpacity={0.7}
        >
          <Calendar size={20} color={Colors.text.secondary} />
          <Text style={styles.datePickerButtonText}>
            {selectedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, time) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (time) setSelectedTime(time);
            }}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location *</Text>
        <View style={styles.iconInputContainer}>
          <MapPin size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.iconInput}
            placeholder="e.g., Central Park, Manhattan"
            placeholderTextColor={Colors.text.light}
            value={location}
            onChangeText={setLocation}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Capacity (Optional)</Text>
        <View style={styles.iconInputContainer}>
          <Users size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.iconInput}
            placeholder="e.g., 1 (how many spots available)"
            placeholderTextColor={Colors.text.light}
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.hint}>
          Leave empty for unlimited spots
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Create Event',
          headerStyle: {
            backgroundColor: Colors.background.card,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {step === 1 ? (
                <X size={24} color={Colors.text.primary} />
              ) : (
                <ChevronLeft size={24} color={Colors.text.primary} />
              )}
            </TouchableOpacity>
          ),
          headerRight: () => (
            <Text style={styles.stepIndicator}>
              {step}/{totalSteps}
            </Text>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderProgressBar()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step < totalSteps ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.coral, Colors.peach]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.finalStepButtons}>
            <TouchableOpacity
              style={styles.draftButton}
              onPress={() => handleCreate(true)}
              activeOpacity={0.8}
              disabled={createEventMutation.isPending}
            >
              <Save size={20} color={Colors.text.secondary} />
              <Text style={styles.draftButtonText}>Save as Draft</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => handleCreate(false)}
              activeOpacity={0.8}
              disabled={createEventMutation.isPending}
            >
              <LinearGradient
                colors={[Colors.coral, Colors.peach]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Check size={20} color={Colors.text.white} />
                <Text style={styles.buttonText}>
                  {createEventMutation.isPending ? 'Creating...' : 'Publish Event'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.card,
  },
  headerButton: {
    padding: 8,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginRight: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border.light,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: Colors.coral,
  },
  stepContainer: {
    gap: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: -16,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  textArea: {
    height: 140,
    paddingTop: 16,
  },
  iconInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 12,
  },
  iconInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  imageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 12,
  },
  imageInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  hint: {
    fontSize: 13,
    color: Colors.text.light,
    marginTop: -4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.coral,
    borderStyle: 'dashed' as const,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.coral,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.border.light,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 12,
  },
  datePickerButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  finalStepButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  categoryChipSelected: {
    backgroundColor: '#FFF0F0',
    borderColor: Colors.coral,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  categoryTextSelected: {
    color: Colors.coral,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: Colors.background.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  nextButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  createButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
});
