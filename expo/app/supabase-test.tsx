import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { supabase, isSupabaseConfigured, checkSupabaseConnection } from '@/lib/supabase';
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react-native';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function SupabaseTestScreen() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, result: Partial<TestResult>) => {
    setTests(prev => prev.map(t => t.name === name ? { ...t, ...result } : t));
  };

  const runTests = useCallback(async () => {
    setIsRunning(true);
    
    const initialTests: TestResult[] = [
      { name: 'Environment Variables', status: 'pending', message: 'Checking...' },
      { name: 'Supabase Client', status: 'pending', message: 'Checking...' },
      { name: 'Database Connection', status: 'pending', message: 'Checking...' },
      { name: 'Auth Service', status: 'pending', message: 'Checking...' },
      { name: 'Tables Access', status: 'pending', message: 'Checking...' },
    ];
    
    setTests(initialTests);

    // Test 1: Environment Variables
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
    
    console.log('[Test] EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET');
    console.log('[Test] EXPO_PUBLIC_SUPABASE_KEY:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');
    
    if (supabaseUrl && supabaseKey) {
      updateTest('Environment Variables', {
        status: 'success',
        message: 'Both URL and Key are configured',
        details: `URL: ${supabaseUrl.substring(0, 40)}...`,
      });
    } else {
      updateTest('Environment Variables', {
        status: 'error',
        message: 'Missing environment variables',
        details: `URL: ${supabaseUrl ? 'SET' : 'MISSING'}, Key: ${supabaseKey ? 'SET' : 'MISSING'}`,
      });
    }

    await delay(300);

    // Test 2: Supabase Client
    console.log('[Test] isSupabaseConfigured:', isSupabaseConfigured);
    console.log('[Test] supabase client:', supabase ? 'INITIALIZED' : 'NULL');
    
    if (isSupabaseConfigured && supabase) {
      updateTest('Supabase Client', {
        status: 'success',
        message: 'Client initialized successfully',
      });
    } else {
      updateTest('Supabase Client', {
        status: 'error',
        message: 'Client not initialized',
        details: isSupabaseConfigured ? 'Config OK but client failed' : 'Not configured',
      });
      setIsRunning(false);
      return;
    }

    await delay(300);

    // Test 3: Database Connection
    try {
      console.log('[Test] Testing database connection...');
      const connected = await checkSupabaseConnection();
      
      if (connected) {
        updateTest('Database Connection', {
          status: 'success',
          message: 'Connected to database',
        });
      } else {
        updateTest('Database Connection', {
          status: 'warning',
          message: 'Could not verify connection',
          details: 'May be RLS policies or network issue',
        });
      }
    } catch (error) {
      console.error('[Test] Database connection error:', error);
      updateTest('Database Connection', {
        status: 'error',
        message: 'Connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    await delay(300);

    // Test 4: Auth Service
    try {
      console.log('[Test] Testing auth service...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[Test] Auth error:', error);
        updateTest('Auth Service', {
          status: 'error',
          message: 'Auth service error',
          details: error.message,
        });
      } else {
        updateTest('Auth Service', {
          status: 'success',
          message: data.session ? 'Session active' : 'Auth service working (no session)',
          details: data.session ? `User: ${data.session.user.email}` : undefined,
        });
      }
    } catch (error) {
      console.error('[Test] Auth test error:', error);
      updateTest('Auth Service', {
        status: 'error',
        message: 'Auth test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    await delay(300);

    // Test 5: Tables Access
    try {
      console.log('[Test] Testing tables access...');
      const tables = ['profiles', 'events', 'users'];
      const results: string[] = [];
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`[Test] Table ${table}:`, error.message);
          results.push(`${table}: ${error.code || 'error'}`);
        } else {
          console.log(`[Test] Table ${table}: OK (${data?.length || 0} rows)`);
          results.push(`${table}: OK`);
        }
      }
      
      const hasErrors = results.some(r => !r.includes('OK'));
      updateTest('Tables Access', {
        status: hasErrors ? 'warning' : 'success',
        message: hasErrors ? 'Some tables have access issues' : 'All tables accessible',
        details: results.join(', '),
      });
    } catch (error) {
      console.error('[Test] Tables test error:', error);
      updateTest('Tables Access', {
        status: 'error',
        message: 'Tables test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setIsRunning(false);
  }, []);

  useEffect(() => {
    runTests();
  }, [runTests]);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={24} color="#22c55e" />;
      case 'error':
        return <XCircle size={24} color="#ef4444" />;
      case 'warning':
        return <AlertCircle size={24} color="#f59e0b" />;
      default:
        return <ActivityIndicator size="small" color="#6366f1" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#dcfce7';
      case 'error': return '#fee2e2';
      case 'warning': return '#fef3c7';
      default: return '#f3f4f6';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Supabase Connection Test</Text>
        <TouchableOpacity onPress={runTests} disabled={isRunning} style={styles.refreshButton}>
          <RefreshCw size={20} color={isRunning ? '#9ca3af' : '#6366f1'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {tests.map((test) => (
          <View 
            key={test.name} 
            style={[styles.testCard, { backgroundColor: getStatusColor(test.status) }]}
          >
            <View style={styles.testHeader}>
              {getStatusIcon(test.status)}
              <View style={styles.testInfo}>
                <Text style={styles.testName}>{test.name}</Text>
                <Text style={styles.testMessage}>{test.message}</Text>
              </View>
            </View>
            {test.details && (
              <Text style={styles.testDetails}>{test.details}</Text>
            )}
          </View>
        ))}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Debug Info</Text>
          <Text style={styles.infoText}>
            Check the console logs for detailed information about each test.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  testCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  testMessage: {
    fontSize: 14,
    color: '#4b5563',
  },
  testDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#3b82f6',
  },
});
