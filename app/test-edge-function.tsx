import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { signupViaEdgeFunction } from '@/lib/authSignup';

export default function TestEdgeFunctionScreen() {
  const router = useRouter();
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password123');
  const [testName, setTestName] = useState('Test User');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSupabaseConfig = () => {
    addLog('=== Testing Supabase Configuration ===');
    addLog(`Supabase configured: ${isSupabaseConfigured}`);
    addLog(`Supabase URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL || 'NOT SET'}`);
    addLog(`Supabase Key exists: ${!!process.env.EXPO_PUBLIC_SUPABASE_KEY}`);
    addLog(`Supabase client exists: ${!!supabase}`);
  };

  const testEdgeFunctionDirect = async () => {
    setIsLoading(true);
    addLog('=== Testing Direct Edge Function Call ===');
    
    try {
      if (!supabase) {
        addLog('❌ Supabase client not initialized');
        return;
      }

      addLog('Calling edge function with test data...');
      const { data, error } = await supabase.functions.invoke('sign_up', {
        body: {
          email: testEmail,
          password: testPassword,
          name: testName,
          dateOfBirth: '1990-01-01',
        },
      });

      if (error) {
        addLog(`❌ Edge function error: ${error.message}`);
        addLog(`Error details: ${JSON.stringify(error, null, 2)}`);
      } else {
        addLog(`✅ Edge function success!`);
        addLog(`Response: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      addLog(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof Error && err.stack) {
        addLog(`Stack: ${err.stack}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testViaHelper = async () => {
    setIsLoading(true);
    addLog('=== Testing Via signupViaEdgeFunction Helper ===');
    
    try {
      const result = await signupViaEdgeFunction({
        email: testEmail,
        password: testPassword,
        name: testName,
        dateOfBirth: '1990-01-01',
      });
      
      addLog(`✅ Signup helper success!`);
      addLog(`Response: ${JSON.stringify(result, null, 2)}`);
    } catch (err) {
      addLog(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof Error && err.stack) {
        addLog(`Stack: ${err.stack}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testFetchDirect = async () => {
    setIsLoading(true);
    addLog('=== Testing Direct Fetch ===');
    
    try {
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sign_up`;
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
      
      addLog(`URL: ${url}`);
      addLog(`Has anon key: ${!!anonKey}`);
      addLog(`Anon key preview: ${anonKey?.substring(0, 20)}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: testName,
          dateOfBirth: '1990-01-01',
        }),
      });

      addLog(`Response status: ${response.status}`);
      const text = await response.text();
      addLog(`Response body: ${text}`);

      if (response.ok) {
        addLog(`✅ Direct fetch success!`);
      } else {
        addLog(`❌ Direct fetch failed with status ${response.status}`);
      }
    } catch (err) {
      addLog(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edge Function Test</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputSection}>
          <Text style={styles.label}>Test Email</Text>
          <TextInput
            style={styles.input}
            value={testEmail}
            onChangeText={setTestEmail}
            placeholder="test@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Test Password</Text>
          <TextInput
            style={styles.input}
            value={testPassword}
            onChangeText={setTestPassword}
            placeholder="password123"
            secureTextEntry
          />

          <Text style={styles.label}>Test Name</Text>
          <TextInput
            style={styles.input}
            value={testName}
            onChangeText={setTestName}
            placeholder="Test User"
          />
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testSupabaseConfig}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>1. Test Config</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={testEdgeFunctionDirect}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>2. Test Edge Function (Direct)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={testViaHelper}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>3. Test Via Helper</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={testFetchDirect}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>4. Test Direct Fetch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.clearButton]}
            onPress={clearLogs}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logsSection}>
          <Text style={styles.logsTitle}>Logs:</Text>
          <ScrollView style={styles.logsScroll}>
            {logs.length === 0 ? (
              <Text style={styles.logText}>No logs yet. Run a test above.</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  inputSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonSection: {
    padding: 16,
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logsSection: {
    padding: 16,
    backgroundColor: '#000',
    minHeight: 300,
  },
  logsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logsScroll: {
    maxHeight: 400,
  },
  logText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
});
