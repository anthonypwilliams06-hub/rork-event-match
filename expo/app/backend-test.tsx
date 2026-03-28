import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Stack } from 'expo-router';

type TestResult = {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
};

export default function BackendTestPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Backend Root Endpoint', status: 'pending' },
    { name: 'Backend /api Endpoint', status: 'pending' },
    { name: 'tRPC Connection', status: 'pending' },
    { name: 'tRPC Example Query', status: 'pending' },
  ]);

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...update } : test));
  };

  const runTests = useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    console.log('[Test] Starting backend tests...');
    console.log('[Test] Base URL:', baseUrl);

    setTests([
      { name: 'Backend Root Endpoint', status: 'pending' },
      { name: 'Backend /api Endpoint', status: 'pending' },
      { name: 'tRPC Connection', status: 'pending' },
      { name: 'tRPC Example Query', status: 'pending' },
    ]);

    try {
      console.log(`[Test 1] Testing root endpoint: ${baseUrl}/`);
      const rootResponse = await fetch(`${baseUrl}/`);
      const rootData = await rootResponse.json();
      console.log('[Test 1] Root response:', rootData);
      updateTest(0, {
        status: 'success',
        message: `Status: ${rootResponse.status}`,
        data: rootData,
      });
    } catch (error) {
      console.error('[Test 1] Root endpoint error:', error);
      updateTest(0, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    try {
      console.log(`[Test 2] Testing /api endpoint: ${baseUrl}/api`);
      const apiResponse = await fetch(`${baseUrl}/api`);
      const apiData = await apiResponse.json();
      console.log('[Test 2] API response:', apiData);
      updateTest(1, {
        status: 'success',
        message: `Status: ${apiResponse.status}`,
        data: apiData,
      });
    } catch (error) {
      console.error('[Test 2] API endpoint error:', error);
      updateTest(1, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    try {
      console.log(`[Test 3] Testing tRPC endpoint: ${baseUrl}/api/trpc`);
      const trpcResponse = await fetch(`${baseUrl}/api/trpc`);
      const trpcText = await trpcResponse.text();
      console.log('[Test 3] tRPC response status:', trpcResponse.status);
      console.log('[Test 3] tRPC response:', trpcText.substring(0, 200));
      
      if (trpcResponse.status === 404) {
        updateTest(2, {
          status: 'error',
          message: '404 - tRPC endpoint not found',
          data: { hint: 'Backend may not be deployed' },
        });
      } else if (trpcResponse.ok) {
        updateTest(2, {
          status: 'success',
          message: `Status: ${trpcResponse.status}`,
          data: { response: trpcText.substring(0, 100) },
        });
      } else {
        updateTest(2, {
          status: 'error',
          message: `Status: ${trpcResponse.status}`,
        });
      }
    } catch (error) {
      console.error('[Test 3] tRPC connection error:', error);
      updateTest(2, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    try {
      console.log('[Test 4] Testing tRPC example.hi mutation...');
      const trpcUrl = `${baseUrl}/api/trpc/example.hi`;
      const trpcResponse = await fetch(trpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test' }),
      });
      
      const result = await trpcResponse.json();
      console.log('[Test 4] tRPC mutation result:', result);
      
      if (trpcResponse.ok && result.result?.data) {
        updateTest(3, {
          status: 'success',
          message: 'Mutation successful',
          data: result.result.data,
        });
      } else {
        updateTest(3, {
          status: 'error',
          message: `Failed: ${trpcResponse.status}`,
          data: result,
        });
      }
    } catch (error) {
      console.error('[Test 4] tRPC mutation error:', error);
      updateTest(3, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  useEffect(() => {
    runTests();
  }, [runTests]);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'pending': return '#f59e0b';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'pending': return '...';
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Backend Connection Test',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Backend Diagnostics</Text>
          <Text style={styles.subtitle}>
            Testing connection to:{'\n'}
            {process.env.EXPO_PUBLIC_RORK_API_BASE_URL}
          </Text>
        </View>

        <TouchableOpacity style={styles.retryButton} onPress={runTests}>
          <Text style={styles.retryButtonText}>Retry All Tests</Text>
        </TouchableOpacity>

        {tests.map((test, index) => (
          <View key={index} style={styles.testCard}>
            <View style={styles.testHeader}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(test.status) }]}>
                <Text style={styles.statusIcon}>{getStatusIcon(test.status)}</Text>
              </View>
              <Text style={styles.testName}>{test.name}</Text>
            </View>

            {test.status === 'pending' && (
              <ActivityIndicator size="small" color="#f59e0b" style={styles.loader} />
            )}

            {test.message && (
              <Text style={[
                styles.message,
                { color: test.status === 'error' ? '#ef4444' : '#10b981' }
              ]}>
                {test.message}
              </Text>
            )}

            {test.data && (
              <View style={styles.dataContainer}>
                <Text style={styles.dataLabel}>Response:</Text>
                <Text style={styles.dataText}>
                  {JSON.stringify(test.data, null, 2)}
                </Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Common Issues:</Text>
          <Text style={styles.infoText}>
            • 404 Error: Backend not deployed at the URL{'\n'}
            • Network Error: Check internet connection{'\n'}
            • CORS Error: Check backend CORS settings{'\n'}
            • JSON Error: Backend returning HTML instead of JSON
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Environment Variables:</Text>
          <Text style={styles.infoText}>
            EXPO_PUBLIC_RORK_API_BASE_URL:{'\n'}
            {process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'Not set'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  testCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  testName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loader: {
    marginVertical: 8,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  dataContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  dataLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    fontWeight: '600',
  },
  dataText: {
    fontSize: 12,
    color: '#22c55e',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as any,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
  },
});
