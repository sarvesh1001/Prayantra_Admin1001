
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

// Define navigation types for Drawer
type DrawerParamList = {
  MainDashboard: undefined;
  Profile: undefined;
  ChangeMPIN: undefined;
  Department: { department: string };
};

// Define Stack navigation types for navigation to Stack screens
type StackParamList = {
  LoginInitiate: undefined;
  SendOTP: { phoneNumber: string; adminId?: string };
  VerifyOTP: { phoneNumber: string; adminId?: string };
  SetupMPIN: { phoneNumber: string; adminId: string };
  VerifyMPIN: { phoneNumber?: string; adminId?: string };
  ForgotMPIN: { phoneNumber?: string };
  MainDrawer: undefined;
};

type IconName = React.ComponentProps<typeof Icon>['name'];

interface CustomDrawerContentProps {
  props: any;
}

const CustomDrawerContent: React.FC<CustomDrawerContentProps> = ({ props }) => {
  const { adminInfo, logout } = useAuth();
  const { showToast } = useToast();
  const drawerNavigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();

  const handleLogout = async () => {
    await logout();
    showToast('success', 'Logged out successfully');
    // Navigation to VerifyMPIN will be handled by AuthContext/navigation state change
  };

  const getRoleBadgeColor = (role: string) => {
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
        return 'Super Admin';
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#C084FC" barStyle="light-content" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Icon name="account-circle" size={60} color="#FFFFFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {adminInfo?.full_name || 'Admin User'}
            </Text>
            <Text style={styles.userRole} numberOfLines={1}>
              {adminInfo?.username || 'admin@company.com'}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(adminInfo?.role_string || 'admin') }]}>
              <Text style={styles.roleBadgeText}>
                {getRoleName(adminInfo?.role_string || 'admin')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="shield-check" size={16} color="#FFFFFF" />
            <Text style={styles.statText}>
              {adminInfo?.permissions?.length || 0} Permissions
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="office-building" size={16} color="#FFFFFF" />
            <Text style={styles.statText}>
              {adminInfo?.departments?.length || 0} Departments
            </Text>
          </View>
        </View>
      </View>

      {/* Drawer Content */}
      <DrawerContentScrollView 
        {...props}
        contentContainerStyle={styles.drawerContent}
        showsVerticalScrollIndicator={false}
      >
        <DrawerItemList {...props} />
        
        {/* Departments Section */}
        {adminInfo?.departments && adminInfo.departments.length > 0 && (
          <View style={styles.departmentsSection}>
            <Text style={styles.sectionTitle}>Departments</Text>
            {adminInfo.departments.map((department, index) => (
              <TouchableOpacity
                key={department}
                style={styles.departmentItem}
                onPress={() => {
                  drawerNavigation.navigate('Department', { department });
                  // @ts-ignore
                  props.navigation.closeDrawer();
                }}
              >
                <View style={[styles.departmentIcon, { backgroundColor: getDepartmentColor(index) }]}>
                  <Icon 
                    name={getDepartmentIcon(department)} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={styles.departmentName} numberOfLines={2}>
                  {department}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </DrawerContentScrollView>

      {/* Footer Section */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Prayantra v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 All rights reserved</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#C084FC',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  drawerContent: {
    paddingTop: 20,
  },
  departmentsSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  departmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  departmentName: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});

export default CustomDrawerContent;