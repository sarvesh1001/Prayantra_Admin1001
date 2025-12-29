import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

type IconName = React.ComponentProps<typeof Icon>['name'];

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { adminInfo, logout } = useAuth();
  const { showToast } = useToast();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '#C084FC';
      case 'admin':
        return '#8B5CF6';
      case 'manager':
        return '#7C3AED';
      case 'employee':
        return '#6D28D9';
      default:
        return '#9333EA';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrator';
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Manager';
      case 'employee':
        return 'Employee';
      default:
        return role;
    }
  };

  const getDepartmentIcon = (department: string): IconName => {
    const icons: Record<string, IconName> = {
      'HR': 'account-group',
      'Finance': 'cash',
      'Accounting': 'calculator',
      'Procurement': 'cart',
      'Inventory': 'warehouse',
      'Logistics': 'truck',
      'Sales': 'chart-line',
      'Marketing': 'bullhorn',
      'Customer Support': 'headset',
      'Operations': 'cog',
      'IT': 'desktop-classic',
      'Production': 'factory',
      'Quality Control': 'check-circle',
      'Quality Assurance': 'shield-check',
      'R&D': 'flask',
      'Administration': 'office-building',
      'Employee Management': 'account-multiple',
      'Manager Management': 'account-tie',
      'Company Management': 'domain',
      'Super Admin Management': 'security',
    };
    return icons[department] || 'folder';
  };

  const departmentColors = [
    '#C084FC', '#A855F7', '#9333EA', '#7C3AED', '#6D28D9',
    '#5B21B6', '#4C1D95', '#3B0764', '#7E22CE', '#6B21A8'
  ];

  const getDepartmentColor = (index: number) => {
    return departmentColors[index % departmentColors.length];
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
            // @ts-ignore
            navigation.navigate('LoginInitiate');
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            // @ts-ignore
            navigation.openDrawer();
          }}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Icon name="account-circle" size={80} color="#C084FC" />
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(adminInfo?.role_string || 'admin') }]}>
            <Text style={styles.roleBadgeText}>
              {getRoleName(adminInfo?.role_string || 'admin')}
            </Text>
          </View>
        </View>

        <Text style={styles.name}>{adminInfo?.full_name || 'Admin User'}</Text>
        <Text style={styles.username}>@{adminInfo?.username || 'admin'}</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Icon name="office-building" size={20} color="#C084FC" />
            <Text style={styles.infoLabel}>Departments</Text>
            <Text style={styles.infoValue}>{adminInfo?.departments?.length || 0}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="shield-check" size={20} color="#C084FC" />
            <Text style={styles.infoLabel}>Permissions</Text>
            <Text style={styles.infoValue}>{adminInfo?.permissions?.length || 0}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="account-check" size={20} color="#C084FC" />
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>
              {adminInfo?.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {/* Departments Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Departments</Text>
        <View style={styles.departmentsGrid}>
          {adminInfo?.departments?.map((dept, index) => (
            <View key={dept} style={styles.departmentTag}>
              <Icon 
                name={getDepartmentIcon(dept)} 
                size={16} 
                color={getDepartmentColor(index)} 
                style={styles.departmentIcon}
              />
              <Text style={styles.departmentText}>{dept}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ChangeMPIN' as never)}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F5F3FF' }]}>
            <Icon name="key-change" size={24} color="#C084FC" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Change MPIN</Text>
            <Text style={styles.actionSubtitle}>Update your secure login PIN</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLogout}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
            <Icon name="logout" size={24} color="#EF4444" />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Logout</Text>
            <Text style={styles.actionSubtitle}>Sign out from your account</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {/* Permissions Section (Collapsible) */}
      {adminInfo?.permissions && adminInfo.permissions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Permissions ({adminInfo.permissions.length})
          </Text>
          <View style={styles.permissionsGrid}>
            {adminInfo.permissions.slice(0, 20).map((permission, index) => (
              <View key={index} style={styles.permissionTag}>
                <Text style={styles.permissionText}>{permission}</Text>
              </View>
            ))}
            {adminInfo.permissions.length > 20 && (
              <Text style={styles.moreText}>
                +{adminInfo.permissions.length - 20} more permissions
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Prayantra Admin Dashboard</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  departmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  departmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
  },
  departmentIcon: {
    marginRight: 6,
  },
  departmentText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  permissionTag: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    margin: 4,
  },
  permissionText: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

export default ProfileScreen;