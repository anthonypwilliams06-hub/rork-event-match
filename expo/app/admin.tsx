import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Stack } from 'expo-router';
import { Shield, Ban, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';

type Tab = 'reports' | 'verifications';

export default function AdminScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [refreshing, setRefreshing] = useState(false);

  const reportsQuery = trpc.admin.listReports.useQuery(
    { token: session?.access_token || '' },
    { enabled: !!session?.access_token && activeTab === 'reports' }
  );

  const verificationsQuery = trpc.admin.listVerifications.useQuery(
    { token: session?.access_token || '' },
    { enabled: !!session?.access_token && activeTab === 'verifications' }
  );

  const banUserMutation = trpc.admin.banUser.useMutation();
  const approveVerificationMutation = trpc.admin.approveVerification.useMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'reports') {
      await reportsQuery.refetch();
    } else {
      await verificationsQuery.refetch();
    }
    setRefreshing(false);
  };

  const handleBanUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Ban User',
      `Are you sure you want to ban ${userName}? This will disable their account and hide all their content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              await banUserMutation.mutateAsync({
                token: session?.access_token || '',
                userId,
              });
              Alert.alert('Success', 'User banned successfully');
              reportsQuery.refetch();
            } catch (error) {
              console.error('Ban user error:', error);
              Alert.alert('Error', 'Failed to ban user');
            }
          },
        },
      ]
    );
  };

  const handleVerification = async (requestId: string, approved: boolean, userName: string) => {
    const action = approved ? 'approve' : 'reject';
    Alert.alert(
      `${approved ? 'Approve' : 'Reject'} Verification`,
      `${action} verification request for ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approved ? 'Approve' : 'Reject',
          style: approved ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await approveVerificationMutation.mutateAsync({
                token: session?.access_token || '',
                requestId,
                approved,
              });
              Alert.alert('Success', `Verification ${action}d`);
              verificationsQuery.refetch();
            } catch (error) {
              console.error('Verification error:', error);
              Alert.alert('Error', `Failed to ${action} verification`);
            }
          },
        },
      ]
    );
  };

  const renderReports = () => {
    if (reportsQuery.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF385C" />
        </View>
      );
    }

    if (!reportsQuery.data || reportsQuery.data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <AlertTriangle size={48} color="#999" />
          <Text style={styles.emptyText}>No reports yet</Text>
        </View>
      );
    }

    return reportsQuery.data.map((report) => (
      <View key={report.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            {report.reporterPhoto ? (
              <Image source={{ uri: report.reporterPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{report.reporterName[0]}</Text>
              </View>
            )}
            <View>
              <Text style={styles.reporterName}>{report.reporterName}</Text>
              <Text style={styles.reportDate}>
                {new Date(report.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, styles[`status_${report.status as 'pending' | 'resolved' | 'dismissed'}`]]}>
            <Text style={styles.statusText}>{report.status}</Text>
          </View>
        </View>

        <View style={styles.reportedSection}>
          <Text style={styles.label}>Reported User:</Text>
          <View style={styles.reportedUser}>
            {report.reportedPhoto ? (
              <Image source={{ uri: report.reportedPhoto }} style={styles.avatarSmall} />
            ) : (
              <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
                <Text style={styles.avatarTextSmall}>{report.reportedName[0]}</Text>
              </View>
            )}
            <Text style={styles.reportedName}>{report.reportedName}</Text>
          </View>
        </View>

        <View style={styles.reasonSection}>
          <Text style={styles.label}>Reason:</Text>
          <Text style={styles.reason}>{report.reason}</Text>
          {report.description && (
            <>
              <Text style={[styles.label, styles.labelMargin]}>Description:</Text>
              <Text style={styles.description}>{report.description}</Text>
            </>
          )}
        </View>

        {report.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.banButton]}
              onPress={() => handleBanUser(report.reportedId, report.reportedName)}
              disabled={banUserMutation.isPending}
            >
              <Ban size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Ban User</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    ));
  };

  const renderVerifications = () => {
    if (verificationsQuery.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF385C" />
        </View>
      );
    }

    if (!verificationsQuery.data || verificationsQuery.data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Shield size={48} color="#999" />
          <Text style={styles.emptyText}>No verification requests</Text>
        </View>
      );
    }

    return verificationsQuery.data.map((verification) => (
      <View key={verification.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            {verification.userPhoto ? (
              <Image source={{ uri: verification.userPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{verification.userName[0]}</Text>
              </View>
            )}
            <View>
              <Text style={styles.reporterName}>{verification.userName}</Text>
              <Text style={styles.reportDate}>{verification.userEmail}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, styles[`status_${verification.status as 'pending' | 'approved' | 'rejected'}`]]}>
            <Text style={styles.statusText}>{verification.status}</Text>
          </View>
        </View>

        <View style={styles.verificationPhoto}>
          <Text style={styles.label}>Verification Photo:</Text>
          <Image source={{ uri: verification.photoUrl }} style={styles.photoPreview} />
        </View>

        <Text style={styles.verificationDate}>
          Submitted: {new Date(verification.createdAt).toLocaleString()}
        </Text>

        {verification.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleVerification(verification.id, true, verification.userName)}
              disabled={approveVerificationMutation.isPending}
            >
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleVerification(verification.id, false, verification.userName)}
              disabled={approveVerificationMutation.isPending}
            >
              <XCircle size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Admin Panel',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
        }}
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
          onPress={() => setActiveTab('reports')}
        >
          <AlertTriangle size={20} color={activeTab === 'reports' ? '#FF385C' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'verifications' && styles.tabActive]}
          onPress={() => setActiveTab('verifications')}
        >
          <Shield size={20} color={activeTab === 'verifications' ? '#FF385C' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'verifications' && styles.tabTextActive]}>
            Verifications
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF385C" />
        }
      >
        {activeTab === 'reports' ? renderReports() : renderVerifications()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  tabs: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF385C',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666',
  },
  tabTextActive: {
    color: '#FF385C',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#FF385C',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600' as const,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  reporterName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  reportDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  status_pending: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  status_resolved: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  status_dismissed: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
  },
  status_approved: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  status_rejected: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
    textTransform: 'uppercase' as const,
  },
  reportedSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#999',
    marginBottom: 8,
  },
  labelMargin: {
    marginTop: 12,
  },
  reportedUser: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  reportedName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  reasonSection: {
    marginBottom: 16,
  },
  reason: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600' as const,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  banButton: {
    backgroundColor: '#dc2626',
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  verificationPhoto: {
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  verificationDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
});
