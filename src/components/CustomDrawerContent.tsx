import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

const { width, height } = Dimensions.get('window');

/* ================= TYPES ================= */

type IconName = React.ComponentProps<typeof Icon>['name'];

interface CustomDrawerContentProps {
  props: any;
}

/* ================= COMPONENT ================= */

const CustomDrawerContent: React.FC<CustomDrawerContentProps> = ({ props }) => {
  const { adminInfo, logout } = useAuth();
  const { showToast } = useToast();
  const navigation = props.navigation; // Get navigation from props

  /* ✅ TS-SAFE GUARDS (NO BEHAVIOR CHANGE) */
  const departments = adminInfo?.departments ?? [];
  const permissionsCount = adminInfo?.permissions?.length ?? 0;

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {
            console.log('Logout cancelled');
          }
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('Logout confirmed');
            
            // Close drawer first
            if (navigation && navigation.closeDrawer) {
              navigation.closeDrawer();
            }
            
            try {
              await logout();
              showToast('success', 'Logged out successfully');
              
              // Navigate to VerifyMPIN after logout
              // Using getParent() to access the root navigator
              const rootNavigation = navigation.getParent ? navigation.getParent() : navigation;
              
              if (rootNavigation && rootNavigation.reset) {
                rootNavigation.reset({
                  index: 0,
                  routes: [{ name: 'VerifyMPIN' }],
                });
              } else if (navigation && navigation.reset) {
                // Fallback to current navigation
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'VerifyMPIN' }],
                });
              }
            } catch (error) {
              console.error('Logout error:', error);
              showToast('error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      {
        // Prevent dismissing on backdrop tap on iOS
        onDismiss: () => {
          console.log('Alert dismissed');
        }
      }
    );
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
      HR: 'account-group',
      Finance: 'cash',
      Accounting: 'calculator',
      Procurement: 'cart',
      Inventory: 'warehouse',
      Logistics: 'truck',
      Sales: 'chart-line',
      Marketing: 'bullhorn',
      'Customer Support': 'headset',
      Operations: 'cog',
      IT: 'desktop-classic',
      Production: 'factory',
      'Quality Control': 'check-circle',
      'Quality Assurance': 'shield-check',
      'R&D': 'flask',
      Administration: 'office-building',
      'Employee Management': 'account-multiple',
      'Manager Management': 'account-tie',
      'Company Management': 'domain',
      'Super Admin Management': 'security',
    };
    return icons[department] || 'folder';
  };

  // Function to handle department press with navigation logic
  const handleDepartmentPress = (department: string) => {
    // Close drawer first
    if (navigation && navigation.closeDrawer) {
      navigation.closeDrawer();
    }
    
    // Navigate based on department
    setTimeout(() => {
      switch (department) {
        case 'Employee Management':
          navigation.navigate('EmployeeManagement');
          break;
        case 'Manager Management':
          navigation.navigate('ManagerManagement');
          break;
        case 'Company Management':
          navigation.navigate('CompanyManagement');
          break;
        default:
          navigation.navigate('Department', { department });
      }
    }, 100);
  };

  const departmentColors = [
    '#C084FC',
    '#A855F7',
    '#9333EA',
    '#7C3AED',
    '#6D28D9',
    '#5B21B6',
    '#4C1D95',
    '#3B0764',
    '#7E22CE',
    '#6B21A8',
  ];

  const getDepartmentColor = (index: number) =>
    departmentColors[index % departmentColors.length];

  /* ================= RENDER ================= */

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#C084FC" barStyle="light-content" />

      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Icon
              name="account-circle"
              size={height * 0.08}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {adminInfo?.full_name || 'Admin User'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {adminInfo?.username || 'admin@company.com'}
            </Text>

            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: getRoleBadgeColor(
                    adminInfo?.role_string || 'admin'
                  ),
                },
              ]}
            >
              <Text style={styles.roleBadgeText}>
                {getRoleName(adminInfo?.role_string || 'admin')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="shield-check" size={width * 0.04} color="#FFFFFF" />
            <Text style={styles.statText}>
              {permissionsCount} Permissions
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon
              name="office-building"
              size={width * 0.04}
              color="#FFFFFF"
            />
            <Text style={styles.statText}>
              {departments.length} Departments
            </Text>
          </View>
        </View>
      </View>

      {/* ===== DRAWER CONTENT ===== */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerContent}
        showsVerticalScrollIndicator={false}
      >
        <DrawerItemList {...props} />

        {/* ===== DEPARTMENTS ===== */}
        {departments.length > 0 && (
          <View style={styles.departmentsSection}>
            <Text style={styles.sectionTitle}>Departments</Text>

            {departments.map((department, index) => (
              <TouchableOpacity
                key={department}
                style={styles.departmentItem}
                onPress={() => handleDepartmentPress(department)}
              >
                <View
                  style={[
                    styles.departmentIcon,
                    { backgroundColor: getDepartmentColor(index) },
                  ]}
                >
                  <Icon
                    name={getDepartmentIcon(department)}
                    size={width * 0.055}
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

      {/* ===== FOOTER ===== */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Icon name="logout" size={width * 0.055} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Prayantra v1.0.0</Text>
          <Text style={styles.copyrightText}>
            © 2024 All rights reserved
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  header: {
    backgroundColor: '#C084FC',
    paddingTop: Platform.OS === 'ios' ? height * 0.08 : height * 0.06,
    paddingHorizontal: width * 0.06,
    paddingBottom: height * 0.025,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.025,
  },
  avatarContainer: { 
    marginRight: width * 0.04 
  },
  userInfo: { 
    flex: 1 
  },
  userName: {
    fontSize: width * 0.048,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: width * 0.035,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: height * 0.01,
  },
  roleBadge: {
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.005,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: width * 0.03,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: width * 0.03,
  },
  statItem: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  statText: {
    fontSize: width * 0.03,
    color: '#FFFFFF',
    marginLeft: width * 0.015,
  },
  drawerContent: { 
    paddingTop: height * 0.02 
  },
  departmentsSection: {
    paddingHorizontal: width * 0.05,
    marginVertical: height * 0.02,
  },
  sectionTitle: {
    fontSize: width * 0.035,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: height * 0.015,
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.025,
    borderRadius: 10,
    marginBottom: height * 0.01,
    backgroundColor: '#F8FAFC',
  },
  departmentIcon: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.035,
  },
  departmentName: {
    fontSize: width * 0.038,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    padding: width * 0.06,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: height * 0.015,
    borderRadius: 10,
    marginBottom: height * 0.02,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: width * 0.038,
    fontWeight: '600',
    marginLeft: width * 0.02,
  },
  versionContainer: { 
    alignItems: 'center' 
  },
  versionText: {
    fontSize: width * 0.032,
    color: '#64748B',
  },
  copyrightText: {
    fontSize: width * 0.028,
    color: '#94A3B8',
  },
});

export default CustomDrawerContent;