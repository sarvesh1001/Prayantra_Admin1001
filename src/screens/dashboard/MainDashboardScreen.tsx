import React, { useState, useEffect } from 'react';
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
import {
  useNavigation,
  DrawerActions,
  NavigationProp,
} from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useToast } from '@/components/Toast';
import DepartmentCard from '@/components/DepartmentCard';
import QuickActions from '@/components/QuickActions';
import StatsOverview from '@/components/StatsOverview';

const { width } = Dimensions.get('window');

/* ============================================================
   Navigation Types
   ============================================================ */

type RootDrawerParamList = {
  MainDashboard: undefined;
  Profile: undefined;
} & {
  [key: `Department_${string}`]: { department: string };
};

type MainDashboardScreenNavigationProp =
  NavigationProp<RootDrawerParamList, 'MainDashboard'>;

/* ============================================================
   Screen
   ============================================================ */

const MainDashboardScreen: React.FC = () => {
  const navigation = useNavigation<MainDashboardScreenNavigationProp>();
  const { adminInfo, logout } = useAuth();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [dailyQuota, setDailyQuota] = useState({
    limit: 0,
    remaining: 0,
    used: 0,
  });

  const { data: profileData, refetch, isLoading } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: () => api.getAdminProfile(),
    enabled: !!adminInfo,
  });

  useEffect(() => {
    if (profileData?.data?.daily_quota) {
      setDailyQuota(profileData.data.daily_quota);
    }
  }, [profileData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDepartmentPress = (department: string) => {
    const screenName: `Department_${string}` =
      `Department_${department.replace(/\s+/g, '_')}`;

    navigation.navigate(screenName, { department });
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
          },
        },
      ],
    );
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const departments: string[] = adminInfo?.departments || [];

  const categorizedDepartments: Record<string, string[]> = {
    'Core Operations': departments.filter(dept =>
      ['HR', 'Finance', 'Accounting', 'Procurement', 'Inventory'].includes(dept),
    ),
    'Business Units': departments.filter(dept =>
      ['Sales', 'Marketing', 'Customer Support', 'Operations'].includes(dept),
    ),
    'Technical & Quality': departments.filter(dept =>
      ['IT', 'Production', 'Quality Control', 'Quality Assurance', 'R&D'].includes(dept),
    ),
    Administration: departments.filter(dept =>
      [
        'Administration',
        'Employee Management',
        'Manager Management',
        'Company Management',
        'Super Admin Management',
      ].includes(dept),
    ),
  };

  return (
    <View style={styles.container}>
      {/* ================= Header ================= */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Icon name="menu" size={28} color="#333" />
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
          <Icon name="account-circle" size={32} color="#1565C0" />
        </TouchableOpacity>
      </View>

      {/* ================= Content ================= */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1565C0']}
            tintColor="#1565C0"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <StatsOverview
          dailyQuota={dailyQuota}
          permissions={adminInfo?.permissions?.length || 0}
          departments={departments.length}
          isLoading={isLoading}
        />

        <QuickActions navigation={navigation} />

        {/* ================= Departments ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Departments</Text>
            <Text style={styles.sectionSubtitle}>
              {departments.length} departments available
            </Text>
          </View>

          {Object.entries(categorizedDepartments).map(([category, depts]) => {
            if (depts.length === 0) return null;

            return (
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
            );
          })}
        </View>

        {/* ================= Daily Quota ================= */}
        {dailyQuota.limit > 0 && (
          <View style={styles.quotaContainer}>
            <View style={styles.quotaHeader}>
              <Icon name="chart-bar" size={20} color="#1565C0" />
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

        {/* ================= Footer ================= */}
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
   Styles
   ============================================================ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

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

  menuButton: { padding: 8 },

  headerTitleContainer: { flex: 1, marginLeft: 16 },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },

  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  profileButton: { padding: 8 },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  section: { marginTop: 24 },

  sectionHeader: { marginBottom: 16 },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },

  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  categorySection: { marginBottom: 24 },

  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },

  departmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },

  quotaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  quotaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  quotaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },

  quotaBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },

  quotaFill: {
    height: '100%',
    backgroundColor: '#1565C0',
    borderRadius: 4,
  },

  quotaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  quotaText: {
    fontSize: 13,
    color: '#64748B',
  },

  footer: {
    marginTop: 32,
    alignItems: 'center',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    marginBottom: 16,
  },

  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },

  versionText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
