import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import Colors from '@/constants/colors';

export default function TestSignupScreen() {
  const [email, setEmail] = useState<string>('test@example.com');
  const [password, setPassword] = useState<string>('password123');
  const [name, setName] = useState<string>('Test User');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testConfig = () => {
    addLog('===== TESTING CONFIGURATION =====');
    addLog(`Supabase Configured: ${isSupabaseConfigured}`);
    addLog(`EXPO_PUBLIC_SUPABASE_URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL || 'NOT SET'}`);
    const key = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (key) {
      addLog(`Anon Key Present: Yes (${key.substring(0, 20)}...)`);
      addLog(`Anon Key Length: ${key.length} chars`);
    } else {
      addLog('❌ Anon Key: NOT SET');
    }
    addLog('=================================');
  };

  const testEdgeFunction = async () => {
    setIsLoading(true);
    addLog('===== TESTING EDGE FUNCTION =====');
    
    try {
      if (!isSupabaseConfigured || !supabase) {
        addLog('❌ Supabase not configured');
        return;
      }

      const dateOfBirth = new Date(1990, 0, 1).toISOString();
      const payload = { email, password, name, dateOfBirth };
      
      addLog(`Calling sign_up function...`);
      addLog(`Payload: ${JSON.stringify({ email, name, dateOfBirth })}`);
      
      const { data, error } = await supabase.functions.invoke('sign_up', {
        body: payload,
      });

      if (error) {
        addLog('❌ Edge function error:');
        addLog(`  Message: ${error.message}`);
        addLog(`  Context: ${JSON.stringify(error.context)}`);
        addLog(`  Full error: ${JSON.stringify(error)}`);
      } else {
        addLog('✅ Edge function success!');
        addLog(`  Response: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      addLog('❌ Unexpected error:');
      addLog(`  ${err instanceof Error ? err.message : String(err)}`);
      addLog(`  Stack: ${err instanceof Error ? err.stack : 'N/A'}`);
    } finally {
      setIsLoading(false);
      addLog('=================================');
    }
  };

  const testHealthcheck = async () => {
    setIsLoading(true);
    addLog('===== TESTING HEALTHCHECK =====');
    
    try {
      if (!isSupabaseConfigured || !supabase) {
        addLog('❌ Supabase not configured');
        return;
      }

      addLog('Calling healthcheck function...');
      
      const { data, error } = await supabase.functions.invoke('healthcheck', {
        body: { test: 'hello' },
      });

      if (error) {
        addLog('❌ Healthcheck error:');
        addLog(`  ${error.message}`);
      } else {
        addLog('✅ Healthcheck success!');
        addLog(`  ${JSON.stringify(data)}`);
      }
    } catch (err) {
      addLog('❌ Unexpected error:');
      addLog(`  ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
      addLog('=================================');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Edge Function Diagnostics</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Data</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={testConfig}
          >
            <Text style={styles.buttonText}>1. Test Config</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={testHealthcheck}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>2. Test Healthcheck</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testEdgeFunction}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>3. Test Signup</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearLogs}
          >
            <Text style={styles.buttonText}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logsContainer}>
          <Text style={styles.logsTitle}>Logs:</Text>
          <ScrollView style={styles.logsScroll}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
            {logs.length === 0 && (
              <Text style={styles.noLogs}>No logs yet. Run tests above.</Text>
            )}
          </ScrollView>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <Text style={styles.instructionsText}>
            1. Click &quot;Test Config&quot; to verify environment variables{'\n'}
            2. Click &quot;Test Healthcheck&quot; to test basic connectivity{'\n'}
            3. Click &quot;Test Signup&quot; to test the sign_up edge function{'\n'}
            {'\n'}
            Expected Anon Key format: eyJhbGc...{'\n'}
            Make sure EXPO_PUBLIC_SUPABASE_KEY is set in environment variables.
          </Text>
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  primaryButton: {
    backgroundColor: Colors.coral,
    borderColor: Colors.coral,
  },
  clearButton: {
    backgroundColor: '#666',
    borderColor: '#666',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  logsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 200,
    maxHeight: 400,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.white,
    marginBottom: 8,
  },
  logsScroll: {
    flex: 1,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace' as const,
    color: '#00ff00',
    marginBottom: 4,
  },
  noLogs: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic' as const,
  },
  instructions: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});
