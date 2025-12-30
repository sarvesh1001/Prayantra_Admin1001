import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { api } from '@/services/api';
import { 
  Role, 
  DepartmentPermissions, 
  CreateEmployeeRoleRequest,
  AdminRoleDetailsResponse,
  RoleDetails
} from '@/types';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isSmallScreen = width < 375;

interface EmployeeRolesResponse {
  meta: {
    count: number;
    role_type?: string;
    role_type_string?: string;
  };
  roles: Role[];
}

// Define interfaces for API responses
interface Department {
  system_department_id: string;
  name: string;
  module_code: string;
  description: string;
  bitmask: number;
}

interface AdminDepartmentsResponse {
  success: boolean;
  data: {
    departments: Department[];
    meta: {
      admin_id: string;
      count: number;
    };
  };
  message: string;
  timestamp: string;
}

interface ModulePermission {
  permission_id: string;
  permission_name: string;
  description: string;
  category: string;
  module: string;
  scope: string;
  requires_tier: string;
  bit_index: number;
  created_at: string;
}

interface ModulePermissionsResponse {
  success: boolean;
  data: {
    meta: {
      count: number;
      module: string;
    };
    permissions: ModulePermission[];
  };
  message: string;
  timestamp: string;
}

interface RoleListItem {
  item: Role;
}

interface DepartmentListItem {
  item: Department;
}

interface PermissionSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (permissions: Record<string, string[]>) => void;
  initialPermissions: Record<string, string[]>;
  availablePermissions: Record<string, string[]>;
  selectedDepartments: Department[];
  isLoadingPermissions: boolean;
}

// Role Details Modal Component
interface RoleDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  roleDetails: RoleDetails | null;
  isLoading: boolean;
}

const RoleDetailsModal: React.FC<RoleDetailsModalProps> = ({
  visible,
  onClose,
  roleDetails,
  isLoading,
}) => {
  if (!roleDetails) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.roleDetailsModalOverlay}>
        <View style={[styles.roleDetailsModalContent, isTablet && styles.roleDetailsModalContentTablet]}>
          <View style={styles.roleDetailsModalHeader}>
            <View style={styles.roleDetailsTitleContainer}>
              <Text style={[styles.roleDetailsModalTitle, isTablet && styles.roleDetailsModalTitleTablet]}>
                Role Details
              </Text>
              <Text style={[styles.roleDetailsModalSubtitle, isTablet && styles.roleDetailsModalSubtitleTablet]}>
                {roleDetails.role.role_name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.roleDetailsModalBody}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#C084FC" style={styles.detailsLoader} />
            ) : (
              <>
                {/* Role Info Section */}
                <View style={styles.roleInfoSection}>
                  <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                    Role Information
                  </Text>
                  <View style={styles.roleInfoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Role Name</Text>
                      <Text style={styles.infoValue}>{roleDetails.role.role_name}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Role Level</Text>
                      <Text style={styles.infoValue}>Level {roleDetails.role.role_level}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Role Type</Text>
                      <Text style={styles.infoValue}>
                        {roleDetails.role.role_type === 1 ? 'Employee' : 
                         roleDetails.role.role_type === 2 ? 'Manager' : 
                         roleDetails.role.role_type === 3 ? 'Admin' : 
                         'Super Admin'}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>System Role</Text>
                      <Text style={styles.infoValue}>
                        {roleDetails.role.is_system_role ? 'Yes' : 'No'}
                      </Text>
                    </View>
                    <View style={[styles.infoItem, styles.fullWidthItem]}>
                      <Text style={styles.infoLabel}>Description</Text>
                      <Text style={[styles.infoValue, styles.descriptionText]}>
                        {roleDetails.role.description || 'No description'}
                      </Text>
                    </View>
                    <View style={[styles.infoItem, styles.fullWidthItem]}>
                      <Text style={styles.infoLabel}>Created</Text>
                      <Text style={styles.infoValue}>
                        {new Date(roleDetails.role.created_at).toLocaleDateString()} at{' '}
                        {new Date(roleDetails.role.created_at).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Departments Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                      Departments ({roleDetails.departments.length})
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{roleDetails.departments.length}</Text>
                    </View>
                  </View>
                  <View style={styles.departmentsGrid}>
                    {roleDetails.departments.map((dept, index) => (
                      <View key={dept.system_department_id} style={styles.departmentChip}>
                        <MaterialCommunityIcons 
                          name="office-building" 
                          size={16} 
                          color="#C084FC" 
                          style={styles.departmentIcon}
                        />
                        <View style={styles.departmentInfo}>
                          <Text style={styles.departmentNameDetails}>{dept.name}</Text>
                          <Text style={styles.departmentModuleDetails}>{dept.module_code}</Text>
                          <Text style={styles.departmentDesc} numberOfLines={2}>
                            {dept.description}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Permissions Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                      Permissions ({roleDetails.permissions.length})
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{roleDetails.permissions.length}</Text>
                    </View>
                  </View>
                  <View style={styles.permissionsListContainer}>
                    {roleDetails.permissions.map((perm, index) => (
                      <View key={perm.permission_id} style={styles.permissionRow}>
                        <View style={styles.permissionHeader}>
                          <Text style={styles.permissionName}>{perm.permission_name}</Text>
                          <View style={styles.permissionBadge}>
                            <Text style={styles.permissionBadgeText}>{perm.module}</Text>
                          </View>
                        </View>
                        <Text style={styles.permissionDescription}>{perm.description}</Text>
                        <View style={styles.permissionMeta}>
                          <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="tag" size={12} color="#64748B" />
                            <Text style={styles.metaText}>{perm.category}</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="shield" size={12} color="#64748B" />
                            <Text style={styles.metaText}>{perm.scope}</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="star" size={12} color="#64748B" />
                            <Text style={styles.metaText}>{perm.requires_tier}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.roleDetailsModalFooter}>
            <TouchableOpacity
              style={[styles.closeDetailsButton, isTablet && styles.closeDetailsButtonTablet]}
              onPress={onClose}
            >
              <MaterialCommunityIcons name="close" size={isTablet ? 20 : 16} color="#64748B" />
              <Text style={[styles.closeDetailsButtonText, isTablet && styles.closeDetailsButtonTextTablet]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// New Permission Selection Modal Component
const PermissionSelectionModal: React.FC<PermissionSelectionModalProps> = ({
  visible,
  onClose,
  onSave,
  initialPermissions,
  availablePermissions,
  selectedDepartments,
  isLoadingPermissions,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>(initialPermissions);

  const togglePermission = (departmentName: string, permission: string) => {
    setSelectedPermissions(prev => {
      const currentPermissions = prev[departmentName] || [];
      
      if (currentPermissions.includes(permission)) {
        return {
          ...prev,
          [departmentName]: currentPermissions.filter(p => p !== permission),
        };
      } else {
        return {
          ...prev,
          [departmentName]: [...currentPermissions, permission],
        };
      }
    });
  };

  const toggleAllPermissions = (departmentName: string) => {
    const currentSelected = selectedPermissions[departmentName] || [];
    const allPermissions = availablePermissions[departmentName] || [];

    if (currentSelected.length === allPermissions.length) {
      // If all are selected, deselect all
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
    } else {
      // Select all permissions
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: allPermissions,
      }));
    }
  };

  const handleSave = () => {
    onSave(selectedPermissions);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.permissionModalOverlay}>
        <View style={[styles.permissionModalContent, isTablet && styles.permissionModalContentTablet]}>
          <View style={styles.permissionModalHeader}>
            <View>
              <Text style={[styles.permissionModalTitle, isTablet && styles.permissionModalTitleTablet]}>
                Select Permissions
              </Text>
              <Text style={[styles.permissionModalSubtitle, isTablet && styles.permissionModalSubtitleTablet]}>
                Configure permissions for selected departments
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.permissionModalBody}
            showsVerticalScrollIndicator={false}
          >
            {selectedDepartments.map(dept => {
              const departmentName = dept.name;
              const moduleCode = dept.module_code;
              const permissions = selectedPermissions[departmentName] || [];
              const allPermissions = availablePermissions[departmentName] || [];
              const isAllSelected = permissions.length === allPermissions.length && permissions.length > 0;

              return (
                <View key={departmentName} style={styles.permissionsSection}>
                  <View style={styles.permissionsHeader}>
                    <View>
                      <Text style={[styles.permissionsTitle, isTablet && styles.permissionsTitleTablet]}>
                        {departmentName}
                      </Text>
                      <Text style={styles.permissionsModule}>
                        Module: {moduleCode}
                      </Text>
                    </View>
                    {allPermissions.length > 0 && (
                      <TouchableOpacity
                        style={styles.selectAllButton}
                        onPress={() => toggleAllPermissions(departmentName)}
                      >
                        <MaterialCommunityIcons
                          name={isAllSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                          size={20}
                          color={isAllSelected ? "#C084FC" : "#64748B"}
                        />
                        <Text style={[
                          styles.selectAllText,
                          isAllSelected && styles.selectAllTextSelected
                        ]}>
                          {isAllSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {isLoadingPermissions ? (
                    <View style={styles.loadingPermissions}>
                      <ActivityIndicator size="small" color="#C084FC" />
                      <Text style={[styles.loadingText, isTablet && styles.loadingTextTablet]}>
                        Loading {moduleCode} permissions...
                      </Text>
                    </View>
                  ) : allPermissions.length === 0 ? (
                    <View style={styles.loadingPermissions}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#EF4444" />
                      <Text style={[styles.loadingText, isTablet && styles.loadingTextTablet]}>
                        No permissions available for {moduleCode} module
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.permissionsGrid}>
                      {allPermissions.map((permission: string) => {
                        const isSelected = permissions.includes(permission);
                        return (
                          <TouchableOpacity
                            key={permission}
                            style={[
                              styles.permissionChip,
                              isSelected && styles.permissionChipSelected,
                              isTablet && styles.permissionChipTablet,
                            ]}
                            onPress={() => togglePermission(departmentName, permission)}
                          >
                            <MaterialCommunityIcons
                              name={isSelected ? "check-circle" : "circle-outline"}
                              size={isTablet ? 20 : 16}
                              color={isSelected ? '#C084FC' : '#64748B'}
                            />
                            <Text
                              style={[
                                styles.permissionText,
                                isSelected && styles.permissionTextSelected,
                                isTablet && styles.permissionTextTablet,
                              ]}
                              numberOfLines={1}
                            >
                              {permission}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <Text style={styles.permissionsCount}>
                    {permissions.length} of {allPermissions.length} permissions selected
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.permissionModalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, isTablet && styles.submitButtonTablet]}
              onPress={handleSave}
            >
              <MaterialCommunityIcons name="check" size={isTablet ? 24 : 20} color="#FFFFFF" />
              <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                Save Permissions
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const EmployeeManagementScreen = () => {
  const { adminId } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  // States
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isPermissionModalVisible, setPermissionModalVisible] = useState(false);
  const [isRoleDetailsModalVisible, setRoleDetailsModalVisible] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, string[]>>({});
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPermissionsFor, setLoadingPermissionsFor] = useState<string[]>([]);
  const [selectedRoleDetails, setSelectedRoleDetails] = useState<RoleDetails | null>(null);
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false);

  // Fetch employee roles using GET /admin/roles/employee
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ['employeeRoles'],
    queryFn: async () => {
      const res = await api.getEmployeeRoles();
      return res.data.data;
    },
  });

  // Fetch admin departments for dropdown using GET /admin/admins/{adminId}/departments
  const {
    data: departmentsData,
    isLoading: isLoadingDepartments,
    refetch: refetchDepartments,
  } = useQuery<AdminDepartmentsResponse>({
    queryKey: ['adminDepartments', adminId],
    queryFn: async () => {
      if (!adminId) throw new Error('Admin ID is required');
      const response = await api.getAdminDepartments(adminId);
      return response.data;
    },
    enabled: !!adminId,
  });

  // Create employee role mutation using POST /admin/roles/employee
  const createRoleMutation = useMutation({
    mutationFn: (roleData: CreateEmployeeRoleRequest) => 
      api.createEmployeeRole(roleData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['employeeRoles'] });
      setCreateModalVisible(false);
      resetForm();
      showToast('success', response.data?.message || 'Employee role created successfully');
    },
    onError: (error: any) => {
      console.error('Create role error:', error);
      if (error.response?.status === 409) {
        showToast('error', 'Role name already exists');
      } else if (error.response?.status === 401) {
        showToast('error', 'Session expired. Please login again');
      } else if (error.response?.status === 403) {
        showToast('error', 'You do not have permission to create employee roles');
      } else {
        showToast('error', error.response?.data?.message || 'Failed to create role');
      }
    },
  });

  // Function to fetch role details
  const fetchRoleDetails = async (roleId: string) => {
    setLoadingRoleDetails(true);
    try {
      const response = await api.getAdminRoleWithDetails(roleId);
      const data = response.data as AdminRoleDetailsResponse;
      setSelectedRoleDetails(data.data);
      setRoleDetailsModalVisible(true);
    } catch (error: any) {
      console.error('Error fetching role details:', error);
      showToast('error', error.response?.data?.message || 'Failed to load role details');
    } finally {
      setLoadingRoleDetails(false);
    }
  };

  // Fetch permissions for a specific module using module_code
  const fetchPermissionsForModule = async (
    moduleCode: string,
    departmentName: string
  ) => {
    try {
      setLoadingPermissionsFor(prev => [...prev, departmentName]);
  
      const response = await api.getPermissionsByModule(moduleCode);
      const permissionsData = response.data as ModulePermissionsResponse;
  
      const rawPermissions = permissionsData?.data?.permissions;
  
      const permissions: string[] = Array.isArray(rawPermissions)
        ? rawPermissions.map((p: ModulePermission) => p.permission_name)
        : [];
  
      setAvailablePermissions(prev => ({
        ...prev,
        [departmentName]: permissions,
      }));
  
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
    } catch (error: any) {
      console.error(
        `Error fetching permissions for module ${moduleCode}:`,
        error
      );
  
      showToast(
        'error',
        `Failed to load permissions for ${departmentName}`
      );
  
      setAvailablePermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
  
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
    } finally {
      setLoadingPermissionsFor(prev =>
        prev.filter(name => name !== departmentName)
      );
    }
  };
  

  // Function to handle opening permission selection modal
  const handleOpenPermissionModal = async () => {
    if (selectedDepartments.length === 0) {
      showToast('error', 'Please select departments first');
      return;
    }

    // Fetch permissions for all selected departments if not already loaded
    const departmentsToLoad = selectedDepartments.filter(
      dept => !availablePermissions[dept.name]
    );

    if (departmentsToLoad.length > 0) {
      showToast('info', 'Loading permissions...');
      await Promise.all(
        departmentsToLoad.map(dept => 
          fetchPermissionsForModule(dept.module_code, dept.name)
        )
      );
    }

    setPermissionModalVisible(true);
  };

  // Handle role click
  const handleRoleClick = (roleId: string) => {
    fetchRoleDetails(roleId);
  };

  // Refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchRoles(), refetchDepartments()]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setRoleName('');
    setDescription('');
    setSelectedDepartments([]);
    setSelectedPermissions({});
    setAvailablePermissions({});
    setLoadingPermissionsFor([]);
    setPermissionModalVisible(false);
  };

  const handleCreateRole = () => {
    if (!roleName.trim()) {
      showToast('error', 'Role name is required');
      return;
    }

    if (selectedDepartments.length === 0) {
      showToast('error', 'Select at least one department');
      return;
    }

    // Validate each selected department has at least one permission
    const hasEmptyPermissions = selectedDepartments.some(dept => {
      const deptName = dept.name;
      return !selectedPermissions[deptName] || selectedPermissions[deptName].length === 0;
    });

    if (hasEmptyPermissions) {
      showToast('error', 'Select at least one permission for each department');
      return;
    }

    // Prepare department_permissions array
    const department_permissions: DepartmentPermissions[] = selectedDepartments.map(dept => ({
      department_name: dept.name,
      permissions: selectedPermissions[dept.name] || [],
    }));

    const roleData: CreateEmployeeRoleRequest = {
      role_name: roleName.trim(),
      description: description.trim(),
      department_permissions,
    };

    console.log('Creating role with data:', roleData);
    createRoleMutation.mutate(roleData);
  };

  // Use department object instead of just name
  const toggleDepartmentSelection = async (department: Department) => {
    const departmentName = department.name;
    
    if (selectedDepartments.some(dept => dept.name === departmentName)) {
      // Remove department and its permissions
      setSelectedDepartments(prev => prev.filter(d => d.name !== departmentName));
      
      const newSelectedPermissions = { ...selectedPermissions };
      delete newSelectedPermissions[departmentName];
      setSelectedPermissions(newSelectedPermissions);
      
      const newAvailablePermissions = { ...availablePermissions };
      delete newAvailablePermissions[departmentName];
      setAvailablePermissions(newAvailablePermissions);
      
    } else {
      // Add department
      setSelectedDepartments(prev => [...prev, department]);
      
      // Fetch permissions using module_code from department
      if (!availablePermissions[departmentName]) {
        await fetchPermissionsForModule(department.module_code, departmentName);
      }
    }
  };

  // Filter roles based on search query
  const filteredRoles = rolesData?.roles?.filter((role: Role) => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      role.role_name.toLowerCase().includes(searchLower) ||
      role.description?.toLowerCase().includes(searchLower)
    );
  }) || [];
  

  const renderDepartmentItem = ({ item }: DepartmentListItem) => {
    const isSelected = selectedDepartments.some(dept => dept.name === item.name);
    
    return (
      <TouchableOpacity
        style={[
          styles.departmentItem,
          isSelected && styles.departmentItemSelected,
          isTablet && styles.departmentItemTablet,
        ]}
        onPress={() => toggleDepartmentSelection(item)}
        disabled={createRoleMutation.isPending}
      >
        <MaterialCommunityIcons
          name={isSelected ? "office-building-cog" : "office-building"}
          size={isTablet ? 24 : 20}
          color={isSelected ? '#C084FC' : '#64748B'}
        />
        <View style={styles.departmentTextContainer}>
          <Text
            style={[
              styles.departmentName,
              isSelected && styles.departmentNameSelected,
              isTablet && styles.departmentNameTablet,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[
              styles.departmentModule,
              isTablet && styles.departmentModuleTablet,
            ]}
            numberOfLines={1}
          >
            Module: {item.module_code}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRoleItem = ({ item }: RoleListItem) => (
    <TouchableOpacity onPress={() => handleRoleClick(item.admin_role_id)}>
      <View style={[styles.roleCard, isTablet && styles.roleCardTablet]}>
        <View style={styles.roleHeader}>
          <View style={styles.roleIconContainer}>
            <MaterialCommunityIcons 
              name={item.is_system_role ? "shield-account" : "account"} 
              size={isTablet ? 28 : 24} 
              color={item.is_system_role ? "#10B981" : "#C084FC"} 
            />
          </View>
          <View style={styles.roleInfo}>
            <Text style={[styles.roleName, isTablet && styles.roleNameTablet]}>{item.role_name}</Text>
            <Text style={styles.roleDescription} numberOfLines={2}>
              {item.description || 'No description'}
            </Text>
          </View>
          <View style={[
            styles.roleBadge,
            item.role_level >= 3000 && styles.roleBadgeHigh,
            item.role_level < 2000 && styles.roleBadgeLow
          ]}>
            <Text style={styles.roleBadgeText}>
              Lvl {item.role_level}
            </Text>
          </View>
        </View>
        
        <View style={styles.roleFooter}>
          <View style={styles.roleTypeContainer}>
            <MaterialCommunityIcons 
              name={item.is_system_role ? "shield-check" : "account-tie"} 
              size={14} 
              color="#64748B" 
            />
            <Text style={styles.roleType}>
              {item.is_system_role ? 'System Role' : 'Employee Role'}
            </Text>
          </View>
          <Text style={styles.roleDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <View style={isTablet && styles.headerContentTablet}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>Employee Role Management</Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            Manage employee roles and permissions • {rolesData?.meta?.count || 0} roles
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => setShowSearch(!showSearch)}
        >
          <MaterialCommunityIcons 
            name={showSearch ? "close" : "magnify"} 
            size={isTablet ? 24 : 20} 
            color="#64748B" 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar - Conditionally Rendered */}
      {showSearch && (
        <View style={[styles.searchContainer, isTablet && styles.searchContainerTablet]}>
          <MaterialCommunityIcons name="magnify" size={isTablet ? 24 : 20} color="#64748B" />
          <TextInput
            style={[styles.searchInput, isTablet && styles.searchInputTablet]}
            placeholder="Search employee roles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Stats Bar */}
      <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="account-group" size={20} color="#C084FC" />
          <Text style={styles.statCount}>{filteredRoles.length}</Text>
          <Text style={styles.statLabel}>Total Roles</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="shield-account" size={20} color="#10B981" />
          <Text style={styles.statCount}>
            {filteredRoles.filter((r: Role) => r.is_system_role).length}
          </Text>
          <Text style={styles.statLabel}>System Roles</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="account-tie" size={20} color="#F59E0B" />
          <Text style={styles.statCount}>
            {filteredRoles.filter((r: Role) => !r.is_system_role).length}
          </Text>
          <Text style={styles.statLabel}>Custom Roles</Text>
        </View>
      </View>

      {/* Roles List */}
      <FlatList
        data={filteredRoles}
        renderItem={renderRoleItem}
        keyExtractor={(item: Role) => item.admin_role_id}
        contentContainerStyle={[
          styles.rolesList,
          isTablet && styles.rolesListTablet,
          filteredRoles.length === 0 && styles.emptyListContainer,
        ]}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet && styles.rolesGridTablet}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#C084FC']}
            tintColor="#C084FC"
          />
        }
        ListEmptyComponent={
          isLoadingRoles ? (
            <ActivityIndicator size="large" color="#C084FC" style={styles.loader} />
          ) : rolesError ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={isTablet ? 80 : 64} color="#EF4444" />
              <Text style={[styles.errorText, isTablet && styles.errorTextTablet]}>
                Failed to load roles
              </Text>
              <Text style={[styles.errorSubtext, isTablet && styles.errorSubtextTablet]}>
                {(rolesError as Error).message || 'Please try again'}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, isTablet && styles.retryButtonTablet]}
                onPress={() => refetchRoles()}
              >
                <MaterialCommunityIcons name="reload" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={isTablet ? 100 : 80} color="#CBD5E1" />
              <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
                No employee roles found
              </Text>
              <Text style={[styles.emptySubtext, isTablet && styles.emptySubtextTablet]}>
                {searchQuery ? 'Try a different search term' : 'Create your first employee role'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={[styles.emptyActionButton, isTablet && styles.emptyActionButtonTablet]}
                  onPress={() => setCreateModalVisible(true)}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyActionButtonText}>Create Role</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Footer with Icons */}
      <View style={[styles.footer, isTablet && styles.footerTablet]}>
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => {
            setSearchQuery('');
            refetchRoles();
            showToast('success', 'Roles refreshed successfully');
          }}
        >
          <View style={[styles.footerIconContainer, styles.refreshIconContainer]}>
            <MaterialCommunityIcons name="reload" size={isTablet ? 28 : 24} color="#C084FC" />
          </View>
          <Text style={styles.footerButtonText}>Get Roles</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <View style={[styles.footerIconContainer, styles.createIconContainer]}>
            <MaterialCommunityIcons name="plus" size={isTablet ? 28 : 24} color="#FFFFFF" />
          </View>
          <Text style={styles.footerButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Create Role Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!createRoleMutation.isPending) {
            setCreateModalVisible(false);
          }
        }}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                  Create Employee Role
                </Text>
                <Text style={[styles.modalSubtitle, isTablet && styles.modalSubtitleTablet]}>
                  Select departments and configure permissions
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  if (!createRoleMutation.isPending) {
                    setCreateModalVisible(false);
                    resetForm();
                  }
                }}
                disabled={createRoleMutation.isPending}
              >
                <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Role Name */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                    Role Name
                  </Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                <TextInput
                  style={[styles.textInput, isTablet && styles.textInputTablet]}
                  value={roleName}
                  onChangeText={setRoleName}
                  placeholder="e.g., Sales Employee, Support Agent"
                  placeholderTextColor="#94A3B8"
                  editable={!createRoleMutation.isPending}
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Description
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, isTablet && styles.textAreaTablet]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the role purpose and responsibilities..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={isTablet ? 4 : 3}
                  editable={!createRoleMutation.isPending}
                />
              </View>

              {/* Departments Selection */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                    Select Departments
                  </Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                  Departments you have access to • {selectedDepartments.length} selected
                </Text>
                
                {isLoadingDepartments ? (
                  <ActivityIndicator size="small" color="#C084FC" style={styles.smallLoader} />
                ) : (
                  <FlatList
                    data={departmentsData?.data?.departments || []}
                    renderItem={renderDepartmentItem}
                    keyExtractor={(item: Department) => item.system_department_id}
                    numColumns={isTablet ? 3 : 2}
                    columnWrapperStyle={styles.departmentGrid}
                    scrollEnabled={false}
                    ListEmptyComponent={
                      <View style={styles.noDepartments}>
                        <MaterialCommunityIcons name="office-building" size={40} color="#CBD5E1" />
                        <Text style={styles.noDepartmentsText}>No departments available</Text>
                      </View>
                    }
                  />
                )}
              </View>

              {/* Permissions Button */}
              {selectedDepartments.length > 0 && (
                <View style={styles.inputGroup}>
                  <View style={styles.permissionsButtonContainer}>
                    <View>
                      <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                        Permissions Configuration
                      </Text>
                      <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                        Click to configure permissions for selected departments
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.permissionsButton, isTablet && styles.permissionsButtonTablet]}
                      onPress={handleOpenPermissionModal}
                      disabled={createRoleMutation.isPending}
                    >
                      <MaterialCommunityIcons 
                        name="shield-edit" 
                        size={isTablet ? 24 : 20} 
                        color="#FFFFFF" 
                      />
                      <Text style={[styles.permissionsButtonText, isTablet && styles.permissionsButtonTextTablet]}>
                        Configure Permissions
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Selected Permissions Summary */}
                  <View style={styles.permissionsSummary}>
                    {selectedDepartments.map(dept => {
                      const perms = selectedPermissions[dept.name] || [];
                      return (
                        <View key={dept.name} style={styles.departmentSummary}>
                          <Text style={styles.departmentSummaryTitle}>
                            {dept.name} ({perms.length} permissions)
                          </Text>
                          {perms.length > 0 ? (
                            <Text style={styles.permissionsListText} numberOfLines={2}>
                              {perms.join(', ')}
                            </Text>
                          ) : (
                            <Text style={styles.noPermissionsText}>No permissions selected</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Summary */}
              {selectedDepartments.length > 0 && (
                <View style={styles.summaryCard}>
                  <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#C084FC" />
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryTitle}>Role Summary</Text>
                    <View style={styles.summaryDetails}>
                      <Text style={styles.summaryText}>
                        • Departments: {selectedDepartments.length}
                      </Text>
                      <Text style={styles.summaryText}>
                        • Modules: {selectedDepartments.map(d => d.module_code).join(', ')}
                      </Text>
                      <Text style={styles.summaryText}>
                        • Total Permissions: {Object.values(selectedPermissions).flat().length}
                      </Text>
                      <Text style={styles.summaryText}>
                        • Role Level: Employee (Type 1)
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
                onPress={() => {
                  setCreateModalVisible(false);
                  resetForm();
                }}
                disabled={createRoleMutation.isPending}
              >
                <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isTablet && styles.submitButtonTablet,
                  createRoleMutation.isPending && styles.submitButtonDisabled,
                  (!roleName.trim() || selectedDepartments.length === 0) && styles.submitButtonDisabled,
                ]}
                onPress={handleCreateRole}
                disabled={createRoleMutation.isPending || !roleName.trim() || selectedDepartments.length === 0}
              >
                {createRoleMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={isTablet ? 24 : 20} color="#FFFFFF" />
                    <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                      Create Role
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Permission Selection Modal */}
      <PermissionSelectionModal
        visible={isPermissionModalVisible}
        onClose={() => setPermissionModalVisible(false)}
        onSave={(permissions) => setSelectedPermissions(permissions)}
        initialPermissions={selectedPermissions}
        availablePermissions={availablePermissions}
        selectedDepartments={selectedDepartments}
        isLoadingPermissions={loadingPermissionsFor.length > 0}
      />

      {/* Role Details Modal */}
      <RoleDetailsModal
        visible={isRoleDetailsModalVisible}
        onClose={() => {
          setRoleDetailsModalVisible(false);
          setSelectedRoleDetails(null);
        }}
        roleDetails={selectedRoleDetails}
        isLoading={loadingRoleDetails}
      />
    </View>
  );
};

// Updated and Added Styles with corrected duplicate property names
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTablet: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContentTablet: {
    flex: 1,
  },
  headerIconButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  titleTablet: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  subtitleTablet: {
    fontSize: 16,
    marginTop: 4,
  },
  // Footer Styles
  footer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  footerTablet: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  footerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  refreshIconContainer: {
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
    borderColor: '#C084FC',
  },
  createIconContainer: {
    backgroundColor: '#C084FC',
  },
  footerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  // Permission Button in Create Modal
  permissionsButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C084FC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  permissionsButtonTablet: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  permissionsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionsButtonTextTablet: {
    fontSize: 14,
  },
  permissionsSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  departmentSummary: {
    marginBottom: 8,
  },
  departmentSummaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  permissionsListText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  noPermissionsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  // Role Details Modal Styles
  roleDetailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  roleDetailsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
  },
  roleDetailsModalContentTablet: {
    maxHeight: height * 0.9,
    width: isTablet ? '80%' : '100%',
    alignSelf: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  roleDetailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  roleDetailsTitleContainer: {
    flex: 1,
  },
  roleDetailsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  roleDetailsModalTitleTablet: {
    fontSize: 24,
  },
  roleDetailsModalSubtitle: {
    fontSize: 14,
    color: '#C084FC',
    marginTop: 2,
    fontWeight: '600',
  },
  roleDetailsModalSubtitleTablet: {
    fontSize: 16,
    marginTop: 4,
  },
  roleDetailsModalBody: {
    padding: 20,
  },
  roleDetailsModalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closeDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    flex: 1,
  },
  closeDetailsButtonTablet: {
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  closeDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  closeDetailsButtonTextTablet: {
    fontSize: 16,
  },
  detailsLoader: {
    marginTop: 40,
    marginBottom: 40,
  },
  // Role Details Content Styles
  roleInfoSection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionTitleTablet: {
    fontSize: 18,
  },
  countBadge: {
    backgroundColor: '#C084FC',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 30,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  roleInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    width: '48%',
    marginBottom: 12,
  },
  fullWidthItem: {
    width: '100%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  descriptionText: {
    fontWeight: '400',
    lineHeight: 20,
  },
  departmentsGrid: {
    gap: 12,
  },
  departmentChip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  departmentIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  departmentInfo: {
    flex: 1,
  },
  departmentNameDetails: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  departmentModuleDetails: {
    fontSize: 12,
    color: '#C084FC',
    fontWeight: '500',
    marginBottom: 4,
  },
  departmentDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  permissionsListContainer: {
    gap: 12,
  },
  permissionRow: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 12,
  },
  permissionBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  permissionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  permissionDescription: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 16,
  },
  permissionMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  // Permission Selection Modal Styles
  permissionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  permissionModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
  },
  permissionModalContentTablet: {
    maxHeight: height * 0.9,
    width: isTablet ? '80%' : '100%',
    alignSelf: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  permissionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  permissionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  permissionModalTitleTablet: {
    fontSize: 24,
  },
  permissionModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  permissionModalSubtitleTablet: {
    fontSize: 14,
    marginTop: 4,
  },
  permissionModalBody: {
    padding: 20,
    maxHeight: height * 0.7,
  },
  permissionModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchContainerTablet: {
    margin: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 14,
    color: '#1E293B',
  },
  searchInputTablet: {
    marginLeft: 12,
    marginRight: 12,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsContainerTablet: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  rolesList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  rolesListTablet: {
    paddingHorizontal: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  rolesGridTablet: {
    justifyContent: 'space-between',
    gap: 16,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roleCardTablet: {
    flex: 1,
    minWidth: '48%',
    marginBottom: 16,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
    marginRight: 12,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  roleNameTablet: {
    fontSize: 18,
  },
  roleDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  roleBadgeHigh: {
    backgroundColor: '#D1FAE5',
  },
  roleBadgeLow: {
    backgroundColor: '#FEF3C7',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  roleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  roleTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleType: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  roleDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  loader: {
    marginTop: 60,
  },
  smallLoader: {
    paddingVertical: 20,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 60,
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    textAlign: 'center',
  },
  errorTextTablet: {
    fontSize: 20,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  errorSubtextTablet: {
    fontSize: 14,
    marginTop: 6,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C084FC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 16,
  },
  retryButtonTablet: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
  },
  emptyTextTablet: {
    fontSize: 20,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  emptySubtextTablet: {
    fontSize: 14,
    marginTop: 6,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C084FC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 16,
  },
  emptyActionButtonTablet: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.85,
  },
  modalContentTablet: {
    maxHeight: height * 0.9,
    width: isTablet ? '80%' : '100%',
    alignSelf: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalTitleTablet: {
    fontSize: 24,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalSubtitleTablet: {
    fontSize: 14,
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  inputLabelTablet: {
    fontSize: 16,
    marginBottom: 8,
  },
  requiredStar: {
    color: '#EF4444',
    fontSize: 14,
  },
  inputSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  inputSubtextTablet: {
    fontSize: 14,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  textInputTablet: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderRadius: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textAreaTablet: {
    minHeight: 100,
  },
  departmentGrid: {
    justifyContent: 'space-between',
    gap: 8,
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '48%',
    minHeight: 60,
  },
  departmentItemTablet: {
    width: '31%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
  },
  departmentItemSelected: {
    backgroundColor: '#FAF5FF',
    borderColor: '#C084FC',
  },
  departmentTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  departmentName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  departmentNameTablet: {
    fontSize: 14,
  },
  departmentNameSelected: {
    color: '#C084FC',
    fontWeight: '600',
  },
  departmentModule: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  departmentModuleTablet: {
    fontSize: 11,
  },
  noDepartments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDepartmentsText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  permissionsSection: {
    marginBottom: 24,
  },
  permissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  permissionsTitleTablet: {
    fontSize: 16,
  },
  permissionsModule: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectAllText: {
    fontSize: 12,
    color: '#64748B',
  },
  selectAllTextSelected: {
    color: '#C084FC',
    fontWeight: '600',
  },
  loadingPermissions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  loadingTextTablet: {
    fontSize: 14,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    maxWidth: width * 0.42,
  },
  permissionChipTablet: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    maxWidth: width * 0.28,
  },
  permissionChipSelected: {
    backgroundColor: '#FAF5FF',
    borderColor: '#C084FC',
  },
  permissionText: {
    fontSize: 11,
    color: '#64748B',
    flexShrink: 1,
  },
  permissionTextTablet: {
    fontSize: 13,
  },
  permissionTextSelected: {
    color: '#C084FC',
    fontWeight: '500',
  },
  permissionsCount: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'right',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  summaryDetails: {
    gap: 4,
  },
  summaryText: {
    fontSize: 11,
    color: '#64748B',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 14,
  },
  cancelButtonTablet: {
    borderRadius: 12,
    paddingVertical: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  cancelButtonTextTablet: {
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C084FC',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonTablet: {
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButtonTextTablet: {
    fontSize: 16,
  },
});

export default EmployeeManagementScreen;