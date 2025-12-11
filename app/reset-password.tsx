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
import { Key, Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

type Step = 'request' | 'confirm' | 'success';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Please enter a valid email' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPasswordReset(email);
      console.log('Reset request successful');
      
      if (result.token) {
        setResetToken(result.token);
      }
      
      setStep('confirm');
      setErrors({});
    } catch (error: any) {
      console.error('Reset request error:', error);
      Alert.alert('Error', error?.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!resetToken.trim()) {
      newErrors.token = 'Reset code is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset(resetToken, newPassword);
      console.log('Password reset successful');
      setStep('success');
      setErrors({});
    } catch (error: any) {
      console.error('Confirm reset error:', error);
      Alert.alert('Error', error?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderRequestStep = () => (
    <>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[Colors.coral, Colors.peach]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Key size={32} color={Colors.text.white} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email to receive a reset code
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
            <Mail size={20} color={errors.email ? '#FF3B30' : Colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={Colors.text.secondary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors({ ...errors, email: '' });
                }
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.actionButton, isLoading && styles.buttonDisabled]}
          onPress={handleRequestReset}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[Colors.coral, Colors.peach]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.actionButtonText}>Send Reset Code</Text>
            <ArrowRight size={20} color={Colors.text.white} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderConfirmStep = () => (
    <>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[Colors.coral, Colors.peach]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Lock size={32} color={Colors.text.white} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Enter Reset Code</Text>
        <Text style={styles.subtitle}>
          Check your email for the reset code
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Reset Code</Text>
          <View style={[styles.inputWrapper, errors.token && styles.inputError]}>
            <Key size={20} color={errors.token ? '#FF3B30' : Colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter reset code"
              placeholderTextColor={Colors.text.secondary}
              value={resetToken}
              onChangeText={(text) => {
                setResetToken(text);
                if (errors.token) {
                  setErrors({ ...errors, token: '' });
                }
              }}
              autoCapitalize="none"
            />
          </View>
          {errors.token ? (
            <Text style={styles.errorText}>{errors.token}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={[styles.inputWrapper, errors.newPassword && styles.inputError]}>
            <Lock size={20} color={errors.newPassword ? '#FF3B30' : Colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={Colors.text.secondary}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) {
                  setErrors({ ...errors, newPassword: '' });
                }
              }}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoComplete="password-new"
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showNewPassword ? (
                <EyeOff size={20} color={Colors.text.secondary} />
              ) : (
                <Eye size={20} color={Colors.text.secondary} />
              )}
            </TouchableOpacity>
          </View>
          {errors.newPassword ? (
            <Text style={styles.errorText}>{errors.newPassword}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
            <Lock size={20} color={errors.confirmPassword ? '#FF3B30' : Colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={Colors.text.secondary}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: '' });
                }
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="password-new"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={Colors.text.secondary} />
              ) : (
                <Eye size={20} color={Colors.text.secondary} />
              )}
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.actionButton, isLoading && styles.buttonDisabled]}
          onPress={handleConfirmReset}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[Colors.coral, Colors.peach]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.actionButtonText}>Reset Password</Text>
            <ArrowRight size={20} color={Colors.text.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#34C759', '#30D158']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <CheckCircle size={32} color={Colors.text.white} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Password Reset!</Text>
        <Text style={styles.subtitle}>
          Your password has been successfully reset
        </Text>
      </View>

      <View style={styles.form}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.replace('/login' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.coral, Colors.peach]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.actionButtonText}>Go to Login</Text>
            <ArrowRight size={20} color={Colors.text.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );

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
          {step === 'request' && renderRequestStep()}
          {step === 'confirm' && renderConfirmStep()}
          {step === 'success' && renderSuccessStep()}
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
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
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
    paddingHorizontal: 20,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginLeft: 4,
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
  eyeIcon: {
    marginLeft: 8,
    padding: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginLeft: 4,
    marginTop: -4,
  },
  actionButton: {
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
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  backButton: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.coral,
  },
});
