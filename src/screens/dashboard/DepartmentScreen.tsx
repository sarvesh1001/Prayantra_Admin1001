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
  FlatList,
} from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

const { width } = Dimensions.get('window');

// Define route params type
type DepartmentScreenRouteProp = RouteProp<any, 'DepartmentScreen'>;

// Define permission categories based on department
const permissionCategories: Record<string, { title: string; permissions: string[] }[]> = {
  'HR': [
    {
      title: 'Employee Management',
      permissions: [
        'Create Employee',
        'Update Employee',
        'Delete Employee',
        'View Employee',
        'Search Employee',
        'Terminate Employee',
        'Transfer Employee',
      ]
    },
    {
      title: 'Document Management',
      permissions: [
        'Upload Document',
        'View Document',
        'Delete Document',
      ]
    },
    {
      title: 'Position Management',
      permissions: [
        'Create Position',
        'Update Position',
        'Delete Position',
        'View Position',
      ]
    },
    {
      title: 'Leave Management',
      permissions: [
        'Request Leave',
        'Approve Leave',
        'Reject Leave',
        'View Leave',
      ]
    },
    {
      title: 'Attendance',
      permissions: [
        'View Attendance',
        'Update Attendance',
      ]
    }
  ],
  'Finance': [
    {
      title: 'Invoice Management',
      permissions: [
        'Create Invoice',
        'Update Invoice',
        'Delete Invoice',
        'View Invoice',
        'Send Invoice',
        'Approve Invoice',
      ]
    },
    {
      title: 'Payment Processing',
      permissions: [
        'Process Payment',
        'Refund Payment',
        'View Payment',
      ]
    },
    {
      title: 'Financial Statements',
      permissions: [
        'View Statement',
        'Download Statement',
      ]
    },
    {
      title: 'Tax Management',
      permissions: [
        'Create Tax',
        'Update Tax',
        'View Tax',
        'Delete Tax',
      ]
    },
    {
      title: 'Budget Management',
      permissions: [
        'Create Budget',
        'Update Budget',
        'Delete Budget',
        'View Budget',
      ]
    }
  ],
  'IT': [
    {
      title: 'Asset Management',
      permissions: [
        'Create Asset',
        'Update Asset',
        'Delete Asset',
        'View Asset',
      ]
    },
    {
      title: 'Incident Management',
      permissions: [
        'Create Incident',
        'Update Incident',
        'Resolve Incident',
        'Close Incident',
        'View Incident',
      ]
    },
    {
      title: 'Access Management',
      permissions: [
        'Request Access',
        'Grant Access',
        'Revoke Access',
      ]
    },
    {
      title: 'System Configuration',
      permissions: [
        'Update Config',
        'View Config',
      ]
    }
  ],
  'Sales': [
    {
      title: 'Lead Management',
      permissions: [
        'Create Lead',
        'Update Lead',
        'Delete Lead',
        'View Lead',
      ]
    },
    {
      title: 'Deal Management',
      permissions: [
        'Create Deal',
        'Update Deal',
        'Delete Deal',
        'View Deal',
        'Close Deal',
      ]
    },
    {
      title: 'Quotation',
      permissions: [
        'Create Quote',
        'Update Quote',
        'Delete Quote',
        'View Quote',
      ]
    },
    {
      title: 'Sales Targets',
      permissions: [
        'Create Target',
        'Update Target',
        'View Target',
      ]
    }
  ],
  'Inventory': [
    {
      title: 'Item Management',
      permissions: [
        'Create Item',
        'Update Item',
        'Delete Item',
        'View Item',
      ]
    },
    {
      title: 'Stock Operations',
      permissions: [
        'Stock In',
        'Stock Out',
        'Stock Transfer',
        'Stock Adjust',
        'Stock Audit',
        'View Stock',
      ]
    },
    {
      title: 'Batch Management',
      permissions: [
        'Create Batch',
        'Update Batch',
        'View Batch',
        'Delete Batch',
      ]
    },
    {
      title: 'Warehouse Management',
      permissions: [
        'Create Warehouse',
        'Update Warehouse',
        'Delete Warehouse',
        'View Warehouse',
      ]
    }
  ],
  'default': [
    {
      title: 'Department Operations',
      permissions: [
        'View Dashboard',
        'Generate Reports',
        'Manage Settings',
        'View Analytics',
        'Create Entries',
        'Update Entries',
        'Delete Entries',
      ]
    }
  ]
};

const DepartmentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<DepartmentScreenRouteProp>();
  const { department } = route.params || {};
  
  const { adminInfo } = useAuth();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const departmentPermissions = permissionCategories[department] || permissionCategories['default'];
  const userPermissions = adminInfo?.permissions || [];

  useEffect(() => {
    if (departmentPermissions.length > 0) {
      setSelectedCategory(departmentPermissions[0].title);
    }
  }, [department]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      showToast('success', 'Department data refreshed');
    }, 1000);
  };

  const hasPermission = (permission: string): boolean => {
    const permissionKey = permission.toLowerCase().replace(/\s+/g, '.');
    return userPermissions.some(p => p.includes(permissionKey));
  };

  const getDepartmentIcon = (dept: string) => {
    const icons: Record<string, string> = {
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
    return icons[dept] || 'folder';
  };

  const getDepartmentColor = (dept: string) => {
    const colors: Record<string, string> = {
      'HR': '#3B82F6',
      'Finance': '#10B981',
      'Accounting': '#8B5CF6',
      'Procurement': '#F59E0B',
      'Inventory': '#EF4444',
      'Logistics': '#EC4899',
      'Sales': '#06B6D4',
      'Marketing': '#84CC16',
      'Customer Support': '#F97316',
      'Operations': '#6366F1',
      'IT': '#0EA5E9',
      'Production': '#8B5CF6',
      'Quality Control': '#10B981',
      'Quality Assurance': '#3B82F6',
      'R&D': '#F59E0B',
      'Administration': '#64748B',
      'Employee Management': '#3B82F6',
      'Manager Management': '#10B981',
      'Company Management': '#8B5CF6',
      'Super Admin Management': '#EF4444',
    };
    return colors[dept] || '#64748B';
  };

  const renderPermissionItem = ({ item }: { item: string }) => (
    <View style={styles.permissionItem}>
      <View style={styles.permissionIconContainer}>
        {hasPermission(item) ? (
          <Icon name="check-circle" size={20} color="#10B981" />
        ) : (
          <Icon name="close-circle" size={20} color="#EF4444" />
        )}
      </View>
      <Text style={[
        styles.permissionText,
        !hasPermission(item) && styles.permissionDisabled
      ]}>
        {item}
      </Text>
      {hasPermission(item) ? (
        <View style={styles.permissionBadge}>
          <Text style={styles.permissionBadgeText}>Granted</Text>
        </View>
      ) : (
        <View style={[styles.permissionBadge, styles.permissionBadgeDisabled]}>
          <Text style={styles.permissionBadgeText}>Restricted</Text>
        </View>
      )}
    </View>
  );

  const renderCategory = () => {
    const category = departmentPermissions.find(cat => cat.title === selectedCategory);
    if (!category) return null;

    return (
      <View style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{category.title}</Text>
        <FlatList
          data={category.permissions}
          renderItem={renderPermissionItem}
          keyExtractor={(item, index) => index.toString()}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  const departmentColor = getDepartmentColor(department);
  const departmentIcon = getDepartmentIcon(department);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <View style={[styles.departmentIcon, { backgroundColor: `${departmentColor}15` }]}>
            <Icon name={departmentIcon as any} size={24} color={departmentColor} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{department}</Text>
            <Text style={styles.headerSubtitle}>
              {departmentPermissions.length} permission categories
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="dots-vertical" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[departmentColor]}
            tintColor={departmentColor}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Department Overview */}
        <View style={styles.overviewContainer}>
          <Text style={styles.overviewTitle}>Department Overview</Text>
          <Text style={styles.overviewText}>
            Manage all {department} related operations and permissions. 
            Below are the available permission categories for this department.
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: departmentColor }]}>
                {departmentPermissions.length}
              </Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: departmentColor }]}>
                {departmentPermissions.reduce((total, cat) => total + cat.permissions.length, 0)}
              </Text>
              <Text style={styles.statLabel}>Permissions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: departmentColor }]}>
                {departmentPermissions.reduce((total, cat) => 
                  total + cat.permissions.filter(p => hasPermission(p)).length, 0
                )}
              </Text>
              <Text style={styles.statLabel}>Granted</Text>
            </View>
          </View>
        </View>

        {/* Permission Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Permission Categories</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {departmentPermissions.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.title && [
                    styles.categoryTabActive,
                    { borderColor: departmentColor }
                  ]
                ]}
                onPress={() => setSelectedCategory(category.title)}
              >
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category.title && [
                    styles.categoryTabTextActive,
                    { color: departmentColor }
                  ]
                ]}>
                  {category.title}
                </Text>
                <View style={styles.permissionCount}>
                  <Text style={styles.permissionCountText}>
                    {category.permissions.filter(p => hasPermission(p)).length}/{category.permissions.length}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Selected Category Permissions */}
          {renderCategory()}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: `${departmentColor}15` }]}>
                <Icon name="plus-circle" size={24} color={departmentColor} />
              </View>
              <Text style={styles.actionText}>Add New</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: `${departmentColor}15` }]}>
                <Icon name="chart-bar" size={24} color={departmentColor} />
              </View>
              <Text style={styles.actionText}>View Reports</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: `${departmentColor}15` }]}>
                <Icon name="cog" size={24} color={departmentColor} />
              </View>
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: `${departmentColor}15` }]}>
                <Icon name="download" size={24} color={departmentColor} />
              </View>
              <Text style={styles.actionText}>Export Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Department Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>About {department} Department</Text>
          <Text style={styles.infoText}>
            This department manages all {department.toLowerCase()} related operations. 
            You have access to specific permissions based on your role and responsibilities. 
            Contact your administrator for additional access requirements.
          </Text>
          
          <View style={styles.infoFooter}>
            <View style={styles.infoItem}>
              <Icon name="clock-outline" size={16} color="#64748B" />
              <Text style={styles.infoItemText}>Last updated: Today</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="account-supervisor" size={16} color="#64748B" />
              <Text style={styles.infoItemText}>Managed by: Admin</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  departmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  overviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  overviewText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  categoriesContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  categoriesScroll: {
    marginBottom: 20,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  categoryTabTextActive: {
    fontWeight: '600',
  },
  permissionCount: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  permissionCountText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  permissionIconContainer: {
    width: 32,
    marginRight: 12,
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  permissionDisabled: {
    color: '#94A3B8',
  },
  permissionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#D1FAE5',
  },
  permissionBadgeDisabled: {
    backgroundColor: '#FEE2E2',
  },
  permissionBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#065F46',
  },
  actionsContainer: {
    marginTop: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  infoContainer: {
    marginTop: 24,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItemText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
});

export default DepartmentScreen;