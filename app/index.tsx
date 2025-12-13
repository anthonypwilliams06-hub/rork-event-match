import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Calendar } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { isSupabaseConfigured, checkSupabaseConnection } from '@/lib/supabase';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { selectRole } = useApp();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isRedirecting, setIsRedirecting] = React.useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');

  useEffect(() => {
    const testConnection = async () => {
      console.log('[Supabase Test] Starting connection test...');
      console.log('[Supabase Test] isSupabaseConfigured:', isSupabaseConfigured);
      
      if (!isSupabaseConfigured) {
        console.log('[Supabase Test] ❌ Supabase not configured');
        setConnectionStatus('failed');
        return;
      }
      
      const isConnected = await checkSupabaseConnection();
      console.log('[Supabase Test] Connection result:', isConnected);
      setConnectionStatus(isConnected ? 'connected' : 'failed');
    };
    
    testConnection();
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const handleRedirect = () => {
      try {
        if (isAuthenticated && user) {
          if (!user.profile) {
            console.log('[Index] Redirecting to create-profile');
            router.replace('/create-profile' as any);
          } else {
            const role = user.profile.role;
            console.log('[Index] User has profile with role:', role);
            if (role === 'creator') {
              router.replace('/dashboard-creator' as any);
            } else if (role === 'seeker') {
              router.replace('/dashboard-seeker' as any);
            } else {
              router.replace('/events' as any);
            }
          }
        } else {
          console.log('[Index] Not authenticated, redirecting to login');
          router.replace('/login' as any);
        }
      } catch (error) {
        console.error('[Index] Redirect error:', error);
        setIsRedirecting(false);
      }
    };

    // Small delay to ensure navigation is ready
    const timeout = setTimeout(handleRedirect, 100);
    return () => clearTimeout(timeout);
  }, [isLoading, isAuthenticated, user, router]);

  // Always show loading while checking auth or redirecting
  if (isLoading || isRedirecting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.coral} />
        <Text style={styles.statusText}>
          {connectionStatus === 'checking' ? '🔄 Testing Supabase...' : 
           connectionStatus === 'connected' ? '✅ Supabase Connected' : 
           '❌ Supabase Connection Failed'}
        </Text>
      </View>
    );
  }

  const handleSelectRole = (role: 'creator' | 'seeker') => {
    console.log('Role selected:', role);
    selectRole(role);
    router.push('/events');
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={[Colors.coral, Colors.peach, Colors.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Heart size={48} color={Colors.text.white} fill={Colors.text.white} />
            <Text style={styles.logo}>Event Match</Text>
            <Text style={styles.tagline}>
              Connect through shared experiences
            </Text>
          </View>

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => router.push('/create-account')}
            activeOpacity={0.8}
          >
            <Text style={styles.createAccountText}>Create Account</Text>
          </TouchableOpacity>

          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelectRole('creator')}
              activeOpacity={0.9}
            >
              <View style={styles.iconContainer}>
                <Calendar size={40} color={Colors.coral} />
              </View>
              <Text style={styles.cardTitle}>Event Creator</Text>
              <Text style={styles.cardDescription}>
                Create amazing events and meet people who share your interests
              </Text>
              <View style={styles.cardButton}>
                <Text style={styles.cardButtonText}>Get Started</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelectRole('seeker')}
              activeOpacity={0.9}
            >
              <View style={styles.iconContainer}>
                <Heart size={40} color={Colors.coral} />
              </View>
              <Text style={styles.cardTitle}>Event Seeker</Text>
              <Text style={styles.cardDescription}>
                Browse events and connect with compatible creators
              </Text>
              <View style={styles.cardButton}>
                <Text style={styles.cardButtonText}>Start Exploring</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.text.white,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: Colors.text.white,
    opacity: 0.9,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  statusText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  cardButton: {
    backgroundColor: Colors.coral,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  createAccountButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignSelf: 'center',
    marginBottom: 32,
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.white,
    textAlign: 'center',
  },
});
