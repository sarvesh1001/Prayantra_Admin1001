import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useToast } from '@/components/Toast';
import DepartmentCard from '@/components/DepartmentCard';
import StatsOverview from '@/components/StatsOverview';

const { width } = Dimensions.get('window');

/* ============================================================
   TYPES
   ============================================================ */

type MainDashboardScreenNavigationProp = {
  navigate: (screen: string, params?: any) => void;
  openDrawer: () => void;
  reset: (state: any) => void;
};

/* ============================================================
   SCREEN
   ============================================================ */

const MainDashboardScreen: React.FC = () => {
  const navigation = useNavigation<MainDashboardScreenNavigationProp>();
  const { adminInfo, logout, validateSession } = useAuth();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  const [dailyQuota, setDailyQuota] = useState({
    limit: 0,
    remaining: 0,
    used: 0,
  });

  /* ============================================================
     ONE-TIME SESSION CHECK (SOFT)
     ============================================================ */

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        console.log('🔍 [DASHBOARD] Soft session check on mount');
        await validateSession(); // 🔑 informational only
      } catch {
        // ❌ DO NOTHING HERE
        // Axios interceptor will handle real failures
      } finally {
        if (mounted) setIsBootstrapped(true);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [validateSession]);

  /* ============================================================
     PROFILE QUERY
     ============================================================ */

  const {
    data: profileData,
    refetch,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: () => api.getAdminProfile(),
    enabled: !!adminInfo && isBootstrapped,
  });

  useEffect(() => {
    if (profileData?.data?.daily_quota) {
      setDailyQuota(profileData.data.daily_quota);
    }
  }, [profileData]);

  /* ============================================================
     HANDLERS
     ============================================================ */

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDepartmentPress = (department: string) => {
    navigation.navigate('Department', { department });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            showToast('success', 'Logged out successfully');
            navigation.reset({
              index: 0,
              routes: [{ name: 'VerifyMPIN' }],
            });
          },
        },
      ],
    );
  };

  /* ============================================================
     LOADING STATE
     ============================================================ */

  if (!isBootstrapped) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="shield-check" size={60} color="#C084FC" />
        <Text style={styles.loadingText}>Preparing dashboard...</Text>
      </View>
    );
  }

  /* ============================================================
     DEPARTMENTS
     ============================================================ */

  const departments: string[] = adminInfo?.departments ?? [];

  const categorizedDepartments: Record<string, string[]> = {
    'Core Operations': departments.filter((d) =>
      ['HR', 'Finance', 'Accounting', 'Procurement', 'Inventory'].includes(d),
    ),
    'Business Units': departments.filter((d) =>
      ['Sales', 'Marketing', 'Customer Support', 'Operations'].includes(d),
    ),
    'Technical & Quality': departments.filter((d) =>
      ['IT', 'Production', 'Quality Control', 'Quality Assurance', 'R&D'].includes(d),
    ),
    Administration: departments.filter((d) =>
      [
        'Administration',
        'Employee Management',
        'Manager Management',
        'Company Management',
        'Super Admin Management',
      ].includes(d),
    ),
  };

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <View style={styles.container}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.menuButton}
        >
          <Icon name="menu" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome back, {adminInfo?.full_name || 'Admin'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.profileButton}
        >
          <Icon name="account-circle" size={32} color="#C084FC" />
        </TouchableOpacity>
      </View>

      {/* ================= CONTENT ================= */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#C084FC']}
            tintColor="#C084FC"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <StatsOverview
          dailyQuota={dailyQuota}
          permissions={adminInfo?.permissions?.length ?? 0}
          departments={departments.length}
          isLoading={profileLoading}
        />

        {/* ================= QUICK ACTIONS ================= */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'key-change', label: 'Change MPIN', screen: 'ChangeMPIN' },
              { icon: 'file-document', label: 'Reports' },
              { icon: 'calendar-clock', label: 'Attendance' },
              { icon: 'chart-bar', label: 'Analytics' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.actionButton}
                onPress={() => item.screen && navigation.navigate(item.screen)}
              >
                <View style={styles.iconContainer}>
                  <Icon name={item.icon as any} size={24} color="#C084FC" />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ================= DEPARTMENTS ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Departments</Text>
            <Text style={styles.sectionSubtitle}>
              {departments.length} departments available
            </Text>
          </View>

          {Object.entries(categorizedDepartments).map(([category, depts]) =>
            depts.length ? (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={styles.departmentsGrid}>
                  {depts.map((department, index) => (
                    <DepartmentCard
                      key={department}
                      department={department}
                      index={index}
                      onPress={() => handleDepartmentPress(department)}
                    />
                  ))}
                </View>
              </View>
            ) : null,
          )}
        </View>

        {/* ================= DAILY QUOTA ================= */}
        {dailyQuota.limit > 0 && (
          <View style={styles.quotaContainer}>
            <View style={styles.quotaHeader}>
              <Icon name="chart-bar" size={20} color="#C084FC" />
              <Text style={styles.quotaTitle}>Daily API Quota</Text>
            </View>

            <View style={styles.quotaBar}>
              <View
                style={[
                  styles.quotaFill,
                  { width: `${(dailyQuota.used / dailyQuota.limit) * 100}%` },
                ]}
              />
            </View>

            <View style={styles.quotaInfo}>
              <Text style={styles.quotaText}>
                {dailyQuota.used} / {dailyQuota.limit} requests used
              </Text>
              <Text style={styles.quotaText}>
                {dailyQuota.remaining} remaining
              </Text>
            </View>
          </View>
        )}

        {/* ================= FOOTER ================= */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="logout" size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Prayantra v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default MainDashboardScreen;

/* ============================================================
   STYLES
   ============================================================ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuButton: { padding: 8, marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  profileButton: { padding: 8 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: { width: '48%', alignItems: 'center', marginBottom: 16 },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  actionLabel: { fontSize: 13, color: '#475569', textAlign: 'center' },
  section: { marginTop: 24 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B' },
  sectionSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  categorySection: { marginBottom: 24 },
  categoryTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 12 },
  departmentsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  quotaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quotaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  quotaTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginLeft: 8 },
  quotaBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  quotaFill: { height: '100%', backgroundColor: '#C084FC', borderRadius: 4 },
  quotaInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  quotaText: { fontSize: 13, color: '#64748B' },
  footer: { marginTop: 32, alignItems: 'center' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    marginBottom: 16,
  },
  logoutText: { color: '#DC2626', fontSize: 14, fontWeight: '500', marginLeft: 8 },
  versionText: { fontSize: 12, color: '#94A3B8' },
});
