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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { api } from '@/services/api';
import {
  Role,
  Department,
  Permission,
  AdminRoleDetailsResponse,
  RoleDetails,
  UpdateRoleRequest,
  DepartmentPermissions,
  CreateEmployeeRoleRequest,
  CreateManagerRoleRequest,
} from '@/types';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

// Interfaces for API responses
interface AllRolesResponse {
  success: boolean;
  data: {
    meta: {
      count: number;
      limit: number;
      offset: number;
      total: number;
    };
    roles: Role[];
  };
  message: string;
  timestamp: string;
}

interface SearchRolesResponse {
  success: boolean;
  data: {
    meta: {
      count: number;
      limit: number;
      offset: number;
      total: number;
    };
    roles: Role[];
  };
  message: string;
  timestamp: string;
}

interface DepartmentListItem {
  item: Department;
}

interface RoleListItem {
  item: Role;
}

// Permission Selection Modal Component
interface PermissionSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (permissions: Record<string, string[]>) => void;
  initialPermissions: Record<string, string[]>;
  availablePermissions: Record<string, string[]>;
  selectedDepartments: Department[];
  isLoadingPermissions: boolean;
  isManagerRole: boolean;
}

const PermissionSelectionModal: React.FC<PermissionSelectionModalProps> = ({
  visible,
  onClose,
  onSave,
  initialPermissions,
  availablePermissions,
  selectedDepartments,
  isLoadingPermissions,
  isManagerRole,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>(initialPermissions);

  useEffect(() => {
    setSelectedPermissions(initialPermissions);
  }, [initialPermissions]);

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
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
    } else {
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: allPermissions,
      }));
    }
  };

  const handleSave = () => {
    // Filter permissions ONLY — do not touch departments
    const cleanedPermissions = Object.fromEntries(
      Object.entries(selectedPermissions).map(([dept, perms]) => [
        dept,
        perms || [],
      ])
    );

    onSave(cleanedPermissions);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.permissionModalOverlay}>
        <View style={[styles.permissionModalContent, isTablet && styles.permissionModalContentTablet]}>
          <View style={styles.permissionModalHeader}>
            <View>
              <Text style={[styles.permissionModalTitle, isTablet && styles.permissionModalTitleTablet]}>
                {isManagerRole ? 'Manager Permissions' : 'Select Permissions'}
              </Text>
              <Text style={[styles.permissionModalSubtitle, isTablet && styles.permissionModalSubtitleTablet]}>
                {isManagerRole
                  ? 'Manager roles automatically receive all permissions'
                  : 'Configure permissions for selected departments'}
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
            {selectedDepartments.map((dept, index) => {
              const departmentName = dept.name;
              const moduleCode = dept.module_code;
              const permissions = selectedPermissions[departmentName] || [];
              const allPermissions = availablePermissions[departmentName] || [];
              const isAllSelected = permissions.length === allPermissions.length && permissions.length > 0;

              return (
                <View key={dept.system_department_id} style={styles.permissionsSection}>
                  {isManagerRole ? (
                    <View style={styles.managerPermissionInfo}>
                      <MaterialCommunityIcons name="shield-check" size={20} color="#8B5CF6" />
                      <Text style={styles.managerPermissionText}>
                        Manager roles automatically get ALL permissions for the {departmentName} department
                      </Text>
                    </View>
                  ) : (
                    <>
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
                            <View style={{ width: 24, alignItems: 'center' }}>
                              <MaterialCommunityIcons
                                name="shield-edit"
                                size={isTablet ? 22 : 18}
                                color="#FFFFFF"
                              />
                            </View>
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
                          <ActivityIndicator size="small" color="#8B5CF6" />
                          <Text style={[styles.loadingTextLarge, isTablet && styles.loadingTextTablet]}>
                            Loading {moduleCode} permissions...
                          </Text>
                        </View>
                      ) : allPermissions.length === 0 ? (
                        <View style={styles.loadingPermissions}>
                          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#EF4444" />
                          <Text style={[styles.loadingTextLarge, isTablet && styles.loadingTextTablet]}>
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
                                  color={isSelected ? '#8B5CF6' : '#64748B'}
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
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={styles.permissionModalSafeFooter}>
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
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

// Role Details Modal Component
const RoleDetailsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  roleDetails: RoleDetails | null;
  isLoading: boolean;
}> = ({ visible, onClose, roleDetails, isLoading }) => {
  if (!roleDetails) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
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
              <ActivityIndicator size="large" color="#8B5CF6" style={styles.detailsLoader} />
            ) : (
              <>
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
                          color="#8B5CF6"
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
                          <View style={styles.permissionMetaItem}>
                            <MaterialCommunityIcons name="tag" size={12} color="#64748B" />
                            <Text style={styles.permissionMetaText}>{perm.category}</Text>
                          </View>
                          <View style={styles.permissionMetaItem}>
                            <MaterialCommunityIcons name="shield" size={12} color="#64748B" />
                            <Text style={styles.permissionMetaText}>{perm.scope}</Text>
                          </View>
                          <View style={styles.permissionMetaItem}>
                            <MaterialCommunityIcons name="star" size={12} color="#64748B" />
                            <Text style={styles.permissionMetaText}>{perm.requires_tier}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={styles.roleDetailsModalSafeFooter}>
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
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

// Enhanced Update Role Modal Component with department and permission editing
const UpdateRoleModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  role: Role | null;
  onUpdate: (roleId: string, data: UpdateRoleRequest) => void;
  isUpdating: boolean;
  availableDepartments: Department[];
}> = ({ visible, onClose, role, onUpdate, isUpdating, availableDepartments }) => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});
  const [originalDepartments, setOriginalDepartments] = useState<Department[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, string[]>>({});
  const [isPermissionModalVisible, setPermissionModalVisible] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, string[]>>({});
  const [loadingPermissionsFor, setLoadingPermissionsFor] = useState<string[]>([]);
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false);
  const { showToast } = useToast();

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  // Load role details when role changes
  useEffect(() => {
    if (visible && role) {
      loadRoleDetails();
    }
  }, [visible, role]);

  const resetForm = () => {
    setRoleName('');
    setDescription('');
    setSelectedDepartments([]);
    setSelectedPermissions({});
    setOriginalDepartments([]);
    setOriginalPermissions({});
    setAvailablePermissions({});
    setLoadingPermissionsFor([]);
    setPermissionModalVisible(false);
  };

  const loadRoleDetails = async () => {
    if (!role) return;

    setLoadingRoleDetails(true);
    try {
      // Fetch role details including departments and permissions
      const response = await api.getAdminRoleWithDetails(role.admin_role_id);
      const roleDetails = response.data.data;

      // Set basic info
      setRoleName(role.role_name);
      setDescription(role.description || '');

      // Set departments
      const departments = roleDetails.departments || [];
      setSelectedDepartments(departments);
      setOriginalDepartments(departments);

      // For employee roles, load permissions
      if (role.role_type === 1 && roleDetails.permissions) {
        // Group permissions by department
        const permissionsByDept: Record<string, string[]> = {};
        
        // First, map module codes to department names
        const moduleToDeptName: Record<string, string> = {};
        departments.forEach((dept: Department) => {
          moduleToDeptName[dept.module_code] = dept.name;
        });
                
        // Group permissions
        roleDetails.permissions.forEach((perm: Permission) => {
          const deptName = moduleToDeptName[perm.module];
          if (deptName) {
            if (!permissionsByDept[deptName]) {
              permissionsByDept[deptName] = [];
            }
            permissionsByDept[deptName].push(perm.permission_name);
          }
        });
        setSelectedPermissions(permissionsByDept);
        setOriginalPermissions(permissionsByDept);
      }

      // Pre-fetch permissions for selected departments
      if (role.role_type === 1) {
        await fetchPermissionsForSelectedDepartments(departments);
      }

    } catch (error: any) {
      console.error('Error loading role details:', error);
      showToast('error', 'Failed to load role details');
    } finally {
      setLoadingRoleDetails(false);
    }
  };

  const fetchPermissionsForSelectedDepartments = async (departments: Department[]) => {
    const departmentsToLoad = departments.filter(
      dept => !availablePermissions[dept.name]
    );

    if (departmentsToLoad.length > 0) {
      await Promise.all(
        departmentsToLoad.map(dept =>
          fetchPermissionsForModule(dept.module_code, dept.name)
        )
      );
    }
  };

  const fetchPermissionsForModule = async (moduleCode: string, departmentName: string) => {
    try {
      setLoadingPermissionsFor(prev => [...prev, departmentName]);
      const response = await api.getPermissionsByModule(moduleCode);
      const permissionsData = response.data;
      const rawPermissions = permissionsData?.data?.permissions;
      const permissions: string[] = Array.isArray(rawPermissions)
        ? rawPermissions.map((p: Permission) => p.permission_name)
        : [];
      setAvailablePermissions(prev => ({
        ...prev,
        [departmentName]: permissions,
      }));
    } catch (error) {
      console.error(`Error fetching permissions for module ${moduleCode}:`, error);
      setAvailablePermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
    } finally {
      setLoadingPermissionsFor(prev => prev.filter(name => name !== departmentName));
    }
  };

  const toggleDepartmentSelection = async (department: Department) => {
    const departmentName = department.name;
    const isCurrentlySelected = selectedDepartments.some(dept => dept.name === departmentName);

    if (isCurrentlySelected) {
      setSelectedDepartments(prev =>
        prev.filter(dept => dept.name !== departmentName)
      );
    
      setSelectedPermissions(prev => {
        const copy = { ...prev };
        delete copy[departmentName];
        return copy;
      });
    
      setAvailablePermissions(prev => {
        const copy = { ...prev };
        delete copy[departmentName];
        return copy;
      });
    }
    
     else {
      // Add department
      setSelectedDepartments(prev => [...prev, department]);
      
      // For employee roles, fetch permissions for this department
      if (role?.role_type === 1 && !availablePermissions[departmentName]) {
        await fetchPermissionsForModule(department.module_code, departmentName);
      }
    }
  };

  const handleOpenPermissionModal = async () => {
    if (selectedDepartments.length === 0) {
      Alert.alert('Error', 'Please select departments first');
      return;
    }
    
    const departmentsToLoad = selectedDepartments.filter(
      dept => !availablePermissions[dept.name]
    );
    
    if (departmentsToLoad.length > 0) {
      await Promise.all(
        departmentsToLoad.map(dept =>
          fetchPermissionsForModule(dept.module_code, dept.name)
        )
      );
    }
    
    setPermissionModalVisible(true);
  };

  const handlePermissionSave = (permissions: Record<string, string[]>) => {
    setSelectedPermissions(prev => {
      const merged = { ...prev };
    
      Object.keys(permissions).forEach(deptName => {
        merged[deptName] = permissions[deptName];
      });
    
      return merged;
    });    
    setPermissionModalVisible(false);
  };

  const handleSubmit = () => {
    if (!role || !roleName.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }
  
    if (selectedDepartments.length === 0) {
      Alert.alert('Error', 'At least one department must be selected');
      return;
    }
  
    const updateData: UpdateRoleRequest = {
      role_name: roleName.trim(),
      description: description.trim(),
    };
  
    /* ============================================================
       DEPARTMENT CHANGES (SOURCE OF TRUTH = DEPARTMENT SELECTION)
       ============================================================ */
  
    const originalDeptNames = originalDepartments.map(d => d.name);
    const selectedDeptNames = selectedDepartments.map(d => d.name);
  
    const addDepartments = selectedDeptNames.filter(
      name => !originalDeptNames.includes(name)
    );
  
    const removeDepartments = originalDeptNames.filter(
      name => !selectedDeptNames.includes(name)
    );
  
    if (addDepartments.length > 0) {
      updateData.add_departments = addDepartments;
    }
  
    if (removeDepartments.length > 0) {
      updateData.remove_departments = removeDepartments;
    }
  
    /* ============================================================
       PERMISSIONS (FINAL SNAPSHOT — NO DIFF LOGIC)
       ============================================================ */
  
    if (role.role_type === 1) {
      updateData.replace_permissions =
        Object.values(selectedPermissions).flat();
    }
  
    /* ============================================================
       SUBMIT UPDATE
       ============================================================ */
  
    onUpdate(role.admin_role_id, updateData);
  };
  
  const renderDepartmentItem = ({ item }: DepartmentListItem) => {
    const isSelected = selectedDepartments.some(dept => dept.name === item.name);
    const isOriginal = originalDepartments.some(dept => dept.name === item.name);
    
    return (
      <TouchableOpacity
        style={[
          styles.departmentItem,
          isSelected && styles.departmentItemSelected,
          isTablet && styles.departmentItemTablet,
          isOriginal && styles.originalDepartmentItem,
        ]}
        onPress={() => toggleDepartmentSelection(item)}
        disabled={isUpdating || loadingRoleDetails}
      >
        <MaterialCommunityIcons
          name={isSelected ? "office-building-cog" : "office-building"}
          size={isTablet ? 24 : 20}
          color={
            isSelected 
              ? '#8B5CF6' 
              : isOriginal 
                ? '#10B981'
                : '#64748B'
          }
        />
        <View style={styles.departmentTextContainer}>
          <Text
            style={[
              styles.departmentName,
              isSelected && styles.departmentNameSelected,
              isOriginal && styles.originalDepartmentName,
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
          {isOriginal && (
            <Text style={styles.originalBadge}>Original</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!role) return null;

  const isEmployeeRole = role.role_type === 1;
  const isSystemRole = role.is_system_role;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.updateModalOverlay}>
        <View style={[styles.updateModalContent, isTablet && styles.updateModalContentTablet]}>
          <View style={styles.updateModalHeader}>
            <View>
              <Text style={[styles.updateModalTitle, isTablet && styles.updateModalTitleTablet]}>
                Update Role: {role.role_name}
              </Text>
              <Text style={[styles.updateModalSubtitle, isTablet && styles.updateModalSubtitleTablet]}>
                {isEmployeeRole ? 'Employee Role' : 'Manager Role'} • {isSystemRole ? 'System Role' : 'Custom Role'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isUpdating || loadingRoleDetails}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            style={styles.updateModalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={loadingRoleDetails}
                onRefresh={loadRoleDetails}
                colors={['#8B5CF6']}
                tintColor="#8B5CF6"
              />
            }
          >
            {loadingRoleDetails ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingRoleText}>Loading role details...</Text>
              </View>
            ) : (
              <>
                {/* Basic Role Info */}
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
                    placeholder="Enter role name"
                    placeholderTextColor="#94A3B8"
                    editable={!isUpdating && !isSystemRole}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                    Description
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, isTablet && styles.textAreaTablet]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter role description"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={isTablet ? 4 : 3}
                    editable={!isUpdating && !isSystemRole}
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
                    {availableDepartments.length} departments available • {selectedDepartments.length} selected
                  </Text>
                  <FlatList
                    data={availableDepartments}
                    renderItem={renderDepartmentItem}
                    keyExtractor={(item: Department) => item.system_department_id}
                    numColumns={isLargeTablet ? 4 : (isTablet ? 3 : 2)}
                    columnWrapperStyle={styles.departmentGrid}
                    scrollEnabled={false}
                    ListEmptyComponent={
                      <View style={styles.noDepartments}>
                        <MaterialCommunityIcons name="office-building" size={40} color="#CBD5E1" />
                        <Text style={styles.noDepartmentsText}>No departments available</Text>
                      </View>
                    }
                  />
                </View>

                {/* Permissions Configuration (Employee Role Only) */}
                {isEmployeeRole && selectedDepartments.length > 0 && (
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
                        disabled={isUpdating}
                      >
                        <MaterialCommunityIcons
                          name="shield-edit"
                          size={isTablet ? 20 : 16}
                          color="#FFFFFF"
                        />
                        <Text style={[styles.permissionsButtonText, isTablet && styles.permissionsButtonTextTablet]}>
                          Configure Permissions
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Permissions Summary */}
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
                                {perms.slice(0, 3).join(', ')}
                                {perms.length > 3 && ` and ${perms.length - 3} more...`}
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

                {/* Manager Role Info */}
                {!isEmployeeRole && selectedDepartments.length > 0 && (
                  <View style={styles.managerInfoCard}>
                    <MaterialCommunityIcons name="information" size={20} color="#8B5CF6" />
                    <View style={styles.managerInfoContent}>
                      <Text style={styles.managerInfoTitle}>Manager Role Information</Text>
                      <Text style={styles.managerInfoText}>
                        Manager roles automatically receive ALL permissions for their assigned departments.
                        No additional permission configuration is required.
                      </Text>
                    </View>
                  </View>
                )}

                {/* System Role Warning */}
                {isSystemRole && (
                  <View style={styles.warningCard}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F59E0B" />
                    <View style={styles.warningContent}>
                      <Text style={styles.warningTitle}>System Role Restrictions</Text>
                      <Text style={styles.warningText}>
                        • System roles have limited editing capabilities{'\n'}
                        • Role name cannot be changed{'\n'}
                        • Only description can be updated
                      </Text>
                    </View>
                  </View>
                )}

                {/* Summary */}
                <View style={styles.summaryCard}>
                  <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#8B5CF6" />
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryTitle}>Update Summary</Text>
                    <View style={styles.summaryDetails}>
                      <Text style={styles.summaryText}>
                        • Role Type: {isEmployeeRole ? 'Employee (Type 1)' : 'Manager (Type 2)'}
                      </Text>
                      <Text style={styles.summaryText}>
                        • Departments: {selectedDepartments.length} selected
                      </Text>
                      {isEmployeeRole && (
                        <Text style={styles.summaryText}>
                          • Total Permissions: {Object.values(selectedPermissions).flat().length}
                        </Text>
                      )}
                      <Text style={styles.summaryText}>
                        • Changes: {
                          (selectedDepartments.length !== originalDepartments.length ||
                          roleName !== role.role_name ||
                          description !== (role.description || '')) 
                            ? 'Yes' 
                            : 'No'
                        }
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={styles.updateModalSafeFooter}>
            <View style={styles.updateModalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
                onPress={onClose}
                disabled={isUpdating}
              >
                <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isTablet && styles.submitButtonTablet,
                  isUpdating && styles.submitButtonDisabled,
                  (!roleName.trim() || selectedDepartments.length === 0) && styles.submitButtonDisabled,
                  isSystemRole && roleName === role.role_name && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  isUpdating || 
                  !roleName.trim() || 
                  selectedDepartments.length === 0 ||
                  (isSystemRole && roleName === role.role_name)
                }
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={isTablet ? 20 : 16} color="#FFFFFF" />
                    <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                      Update Role
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>

      {/* Permission Selection Modal */}
      {isEmployeeRole && (
        <PermissionSelectionModal
          visible={isPermissionModalVisible}
          onClose={() => setPermissionModalVisible(false)}
          onSave={handlePermissionSave}
          initialPermissions={selectedPermissions}
          availablePermissions={availablePermissions}
          selectedDepartments={selectedDepartments}
          isLoadingPermissions={loadingPermissionsFor.length > 0}
          isManagerRole={false}
        />
      )}
    </Modal>
  );
};

// Create Role Modal Component
const CreateRoleModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (roleType: 'employee' | 'manager', data: any) => void;
  isCreating: boolean;
  availableDepartments: Department[];
}> = ({ visible, onClose, onSave, isCreating, availableDepartments }) => {
  const [roleType, setRoleType] = useState<'employee' | 'manager'>('employee');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});
  const [isPermissionModalVisible, setPermissionModalVisible] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, string[]>>({});
  const [loadingPermissionsFor, setLoadingPermissionsFor] = useState<string[]>([]);

  const resetForm = () => {
    setRoleName('');
    setDescription('');
    setSelectedDepartments([]);
    setSelectedPermissions({});
    setAvailablePermissions({});
    setLoadingPermissionsFor([]);
    setPermissionModalVisible(false);
  };

  const handleClose = () => {
    if (!isCreating) {
      resetForm();
      onClose();
    }
  };

  const fetchPermissionsForModule = async (moduleCode: string, departmentName: string) => {
    try {
      setLoadingPermissionsFor(prev => [...prev, departmentName]);
      const response = await api.getPermissionsByModule(moduleCode);
      const permissionsData = response.data;
      const rawPermissions = permissionsData?.data?.permissions;
      const permissions: string[] = Array.isArray(rawPermissions)
        ? rawPermissions.map((p: Permission) => p.permission_name)
        : [];
      setAvailablePermissions(prev => ({
        ...prev,
        [departmentName]: permissions,
      }));
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
    } catch (error) {
      console.error(`Error fetching permissions for module ${moduleCode}:`, error);
      setAvailablePermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
    } finally {
      setLoadingPermissionsFor(prev => prev.filter(name => name !== departmentName));
    }
  };

  const toggleDepartmentSelection = async (department: Department) => {
    const departmentName = department.name;
    if (selectedDepartments.some(dept => dept.name === departmentName)) {
      setSelectedDepartments(prev => prev.filter(d => d.name !== departmentName));
      const newSelectedPermissions = { ...selectedPermissions };
      delete newSelectedPermissions[departmentName];
      setSelectedPermissions(newSelectedPermissions);
      const newAvailablePermissions = { ...availablePermissions };
      delete newAvailablePermissions[departmentName];
      setAvailablePermissions(newAvailablePermissions);
    } else {
      setSelectedDepartments(prev => [...prev, department]);
      if (!availablePermissions[departmentName]) {
        await fetchPermissionsForModule(department.module_code, departmentName);
      }
    }
  };

  const handleOpenPermissionModal = async () => {
    if (selectedDepartments.length === 0) {
      Alert.alert('Error', 'Please select departments first');
      return;
    }
    const departmentsToLoad = selectedDepartments.filter(
      dept => !availablePermissions[dept.name]
    );
    if (departmentsToLoad.length > 0) {
      await Promise.all(
        departmentsToLoad.map(dept =>
          fetchPermissionsForModule(dept.module_code, dept.name)
        )
      );
    }
    setPermissionModalVisible(true);
  };

  const handleCreateRole = () => {
    if (!roleName.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }
    if (selectedDepartments.length === 0) {
      Alert.alert('Error', 'Select at least one department');
      return;
    }

    if (roleType === 'employee') {
      // For employee roles, check permissions
      const hasEmptyPermissions = selectedDepartments.some(dept => {
        const deptName = dept.name;
        return !selectedPermissions[deptName] || selectedPermissions[deptName].length === 0;
      });
      if (hasEmptyPermissions) {
        Alert.alert('Error', 'Select at least one permission for each department');
        return;
      }

      const department_permissions: DepartmentPermissions[] = selectedDepartments.map(dept => ({
        department_name: dept.name,
        permissions: selectedPermissions[dept.name] || [],
      }));

      const roleData: CreateEmployeeRoleRequest = {
        role_name: roleName.trim(),
        description: description.trim(),
        department_permissions,
      };

      onSave('employee', roleData);
    } else {
      // For manager roles, just send department names
      const department_names = selectedDepartments.map(dept => dept.name);
      const roleData: CreateManagerRoleRequest = {
        role_name: roleName.trim(),
        description: description.trim(),
        department_names,
      };

      onSave('manager', roleData);
    }
  };

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
        disabled={isCreating}
      >
        <MaterialCommunityIcons
          name={isSelected ? "office-building-cog" : "office-building"}
          size={isTablet ? 24 : 20}
          color={isSelected ? '#8B5CF6' : '#64748B'}
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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.createModalOverlay}>
        <View style={[styles.createModalContent, isTablet && styles.createModalContentTablet]}>
          <View style={styles.createModalHeader}>
            <View>
              <Text style={[styles.createModalTitle, isTablet && styles.createModalTitleTablet]}>
                Create New Role
              </Text>
              <Text style={[styles.createModalSubtitle, isTablet && styles.createModalSubtitleTablet]}>
                Configure a new {roleType} role
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={isCreating}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.createModalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Role Type Selection */}
            <View style={styles.roleTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.roleTypeOption,
                  roleType === 'employee' && styles.roleTypeOptionSelected,
                ]}
                onPress={() => setRoleType('employee')}
                disabled={isCreating}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color={roleType === 'employee' ? '#8B5CF6' : '#64748B'}
                />
                <Text style={[
                  styles.roleTypeText,
                  roleType === 'employee' && styles.roleTypeTextSelected,
                ]}>
                  Employee Role
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleTypeOption,
                  roleType === 'manager' && styles.roleTypeOptionSelected,
                ]}
                onPress={() => setRoleType('manager')}
                disabled={isCreating}
              >
                <MaterialCommunityIcons
                  name="account-tie"
                  size={20}
                  color={roleType === 'manager' ? '#8B5CF6' : '#64748B'}
                />
                <Text style={[
                  styles.roleTypeText,
                  roleType === 'manager' && styles.roleTypeTextSelected,
                ]}>
                  Manager Role
                </Text>
              </TouchableOpacity>
            </View>

            {/* Role Info */}
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
                placeholder="e.g., Sales Manager, Support Agent"
                placeholderTextColor="#94A3B8"
                editable={!isCreating}
              />
            </View>

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
                editable={!isCreating}
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
                {availableDepartments.length} departments available • {selectedDepartments.length} selected
              </Text>
              <FlatList
                data={availableDepartments}
                renderItem={renderDepartmentItem}
                keyExtractor={(item: Department) => item.system_department_id}
                numColumns={isLargeTablet ? 4 : (isTablet ? 3 : 2)}
                columnWrapperStyle={styles.departmentGrid}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.noDepartments}>
                    <MaterialCommunityIcons name="office-building" size={40} color="#CBD5E1" />
                    <Text style={styles.noDepartmentsText}>No departments available</Text>
                  </View>
                }
              />
            </View>

            {/* Permissions Button (Employee Role Only) */}
            {roleType === 'employee' && selectedDepartments.length > 0 && (
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
                    disabled={isCreating}
                  >
                    <MaterialCommunityIcons
                      name="shield-edit"
                      size={isTablet ? 20 : 16}
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

            {/* Manager Role Info */}
            {roleType === 'manager' && (
              <View style={styles.managerInfoCard}>
                <MaterialCommunityIcons name="information" size={20} color="#8B5CF6" />
                <View style={styles.managerInfoContent}>
                  <Text style={styles.managerInfoTitle}>Manager Role Information</Text>
                  <Text style={styles.managerInfoText}>
                    Manager roles automatically receive ALL permissions for their assigned departments.
                    No additional permission configuration is required.
                  </Text>
                </View>
              </View>
            )}

            {/* Summary */}
            {selectedDepartments.length > 0 && (
              <View style={styles.summaryCard}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#8B5CF6" />
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryTitle}>Role Summary</Text>
                  <View style={styles.summaryDetails}>
                    <Text style={styles.summaryText}>
                      • Role Type: {roleType === 'employee' ? 'Employee (Type 1)' : 'Manager (Type 2)'}
                    </Text>
                    <Text style={styles.summaryText}>
                      • Departments: {selectedDepartments.length}
                    </Text>
                    <Text style={styles.summaryText}>
                      • Modules: {selectedDepartments.map(d => d.module_code).join(', ')}
                    </Text>
                    {roleType === 'employee' ? (
                      <Text style={styles.summaryText}>
                        • Total Permissions: {Object.values(selectedPermissions).flat().length}
                      </Text>
                    ) : (
                      <Text style={styles.summaryText}>
                        • Manager will receive: ALL permissions for selected departments
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={styles.createModalSafeFooter}>
            <View style={styles.createModalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
                onPress={handleClose}
                disabled={isCreating}
              >
                <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isTablet && styles.submitButtonTablet,
                  isCreating && styles.submitButtonDisabled,
                  (!roleName.trim() || selectedDepartments.length === 0) && styles.submitButtonDisabled,
                ]}
                onPress={handleCreateRole}
                disabled={isCreating || !roleName.trim() || selectedDepartments.length === 0}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="plus"
                      size={isTablet ? 20 : 16}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                      {roleType === 'employee' ? 'Create Employee Role' : 'Create Manager Role'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>

      {/* Permission Selection Modal */}
      <PermissionSelectionModal
        visible={isPermissionModalVisible}
        onClose={() => setPermissionModalVisible(false)}
        onSave={(permissions) => setSelectedPermissions(permissions)}
        initialPermissions={selectedPermissions}
        availablePermissions={availablePermissions}
        selectedDepartments={selectedDepartments}
        isLoadingPermissions={loadingPermissionsFor.length > 0}
        isManagerRole={roleType === 'manager'}
      />
    </Modal>
  );
};

// Main Company Management Screen Component
const CompanyManagementScreen = () => {
  const { adminId } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleType, setSelectedRoleType] = useState<'all' | 'employee' | 'manager' | 'super_admin'>('all');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isRoleDetailsModalVisible, setIsRoleDetailsModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRoleDetails, setSelectedRoleDetails] = useState<RoleDetails | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);

  // Fetch all roles
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery<AllRolesResponse>({
    queryKey: ['allRoles'],
    queryFn: async () => {
      const response = await api.getAllRoles({ limit: 100, offset: 0 });
      return response.data;
    },
  });

  // Fetch search results
  const {
    data: searchResults,
    isLoading: isLoadingSearch,
    refetch: refetchSearch,
  } = useQuery<SearchRolesResponse>({
    queryKey: ['searchRoles', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const response = await api.searchRoles(searchQuery, { limit: 50, offset: 0 });
      return response.data;
    },
    enabled: false,
  });

  // Fetch admin departments
  const {
    data: departmentsData,
    isLoading: isLoadingDepartments,
    refetch: refetchDepartments,
  } = useQuery({
    queryKey: ['adminDepartments', adminId],
    queryFn: async () => {
      if (!adminId) throw new Error('Admin ID is required');
      const response = await api.getAdminDepartments(adminId);
      return response.data;
    },
    enabled: !!adminId,
  });

  useEffect(() => {
    if (departmentsData?.data?.departments) {
      setAvailableDepartments(departmentsData.data.departments);
    }
  }, [departmentsData]);

  // Create employee role mutation
  const createEmployeeRoleMutation = useMutation({
    mutationFn: (roleData: CreateEmployeeRoleRequest) =>
      api.createEmployeeRole(roleData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      queryClient.invalidateQueries({ queryKey: ['employeeRoles'] });
      setCreateModalVisible(false);
      showToast('success', response.data?.message || 'Employee role created successfully');
    },
    onError: (error: any) => {
      console.error('Create role error:', error);
      if (error.response?.status === 409) {
        showToast('error', 'Role name already exists');
      } else if (error.response?.status === 401) {
        showToast('error', 'Session expired. Please login again');
      } else if (error.response?.status === 403) {
        showToast('error', 'You do not have permission to create roles');
      } else {
        showToast('error', error.response?.data?.message || 'Failed to create role');
      }
    },
  });

  // Create manager role mutation
  const createManagerRoleMutation = useMutation({
    mutationFn: (roleData: CreateManagerRoleRequest) =>
      api.createManagerRole(roleData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      queryClient.invalidateQueries({ queryKey: ['managerRoles'] });
      setCreateModalVisible(false);
      showToast('success', response.data?.message || 'Manager role created successfully');
    },
    onError: (error: any) => {
      console.error('Create manager role error:', error);
      if (error.response?.status === 409) {
        showToast('error', 'Role name already exists');
      } else if (error.response?.status === 401) {
        showToast('error', 'Session expired. Please login again');
      } else if (error.response?.status === 403) {
        showToast('error', 'You do not have permission to create manager roles');
      } else {
        showToast('error', error.response?.data?.message || 'Failed to create manager role');
      }
    },
  });

  // Update role mutation - FIXED to use correct API
  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: UpdateRoleRequest }) =>
      api.updateRole(roleId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      setIsUpdateModalVisible(false);
      setSelectedRole(null);
      showToast('success', response.data?.message || 'Role updated successfully');
    },
    onError: (error: any) => {
      console.error('Update role error:', error);
      if (error.response?.status === 401) {
        showToast('error', 'Session expired. Please login again');
      } else if (error.response?.status === 403) {
        showToast('error', 'You do not have permission to update roles');
      } else if (error.response?.status === 404) {
        showToast('error', 'Role not found');
      } else {
        showToast('error', error.response?.data?.message || 'Failed to update role');
      }
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => api.deleteRole(roleId),
    onSuccess: (response, roleId) => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      showToast('success', response.data?.message || 'Role deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete role error:', error);
      if (error.response?.status === 401) {
        showToast('error', 'Session expired. Please login again');
      } else if (error.response?.status === 403) {
        showToast('error', 'You do not have permission to delete roles');
      } else if (error.response?.status === 404) {
        showToast('error', 'Role not found');
      } else if (error.response?.status === 409) {
        showToast('error', 'Cannot delete system role');
      } else {
        showToast('error', error.response?.data?.message || 'Failed to delete role');
      }
    },
  });

  const fetchRoleDetails = async (roleId: string) => {
    setLoadingRoleDetails(true);
    try {
      const response = await api.getAdminRoleWithDetails(roleId);
      const data = response.data as AdminRoleDetailsResponse;
      setSelectedRoleDetails(data.data);
      setIsRoleDetailsModalVisible(true);
    } catch (error: any) {
      console.error('Error fetching role details:', error);
      showToast('error', error.response?.data?.message || 'Failed to load role details');
    } finally {
      setLoadingRoleDetails(false);
    }
  };

  const handleRoleClick = (role: Role) => {
    setSelectedRole(role);
    fetchRoleDetails(role.admin_role_id);
  };

  const handleEditRole = (role: Role) => {
    if (role.is_system_role) {
      showToast('error', 'System roles cannot be edited');
      return;
    }
    setSelectedRole(role);
    setIsUpdateModalVisible(true);
  };

  const handleDeleteRole = (role: Role) => {
    if (role.is_system_role) {
      showToast('error', 'System roles cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Role',
      `Are you sure you want to delete "${role.role_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRoleMutation.mutate(role.admin_role_id),
        },
      ]
    );
  };

  const handleUpdateRole = (roleId: string, data: UpdateRoleRequest) => {
    updateRoleMutation.mutate({ roleId, data });
  };

  const handleCreateRole = (roleType: 'employee' | 'manager', data: any) => {
    if (roleType === 'employee') {
      createEmployeeRoleMutation.mutate(data);
    } else {
      createManagerRoleMutation.mutate(data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchRoles(), refetchDepartments()]);
      if (searchQuery.trim()) {
        await refetchSearch();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      refetchSearch();
    }
  };

  const filterRolesByType = (roles: Role[]) => {
    if (selectedRoleType === 'all') return roles;
    if (selectedRoleType === 'employee') return roles.filter(r => r.role_type === 1);
    if (selectedRoleType === 'manager') return roles.filter(r => r.role_type === 2);
    if (selectedRoleType === 'super_admin') return roles.filter(r => r.role_type === 4);
    return roles;
  };

  const rolesToDisplay = searchQuery.trim() && searchResults?.data?.roles
    ? filterRolesByType(searchResults.data.roles)
    : filterRolesByType(rolesData?.data?.roles || []);

  const totalRoles = rolesData?.data?.roles?.length || 0;
  const employeeRoles = rolesData?.data?.roles?.filter(r => r.role_type === 1).length || 0;
  const managerRoles = rolesData?.data?.roles?.filter(r => r.role_type === 2).length || 0;
  const superAdminRoles = rolesData?.data?.roles?.filter(r => r.role_type === 4).length || 0;
  const systemRoles = rolesData?.data?.roles?.filter(r => r.is_system_role).length || 0;

  const renderRoleItem = ({ item }: RoleListItem) => (
    <View style={[styles.roleCard, isTablet && styles.roleCardTablet]}>
      <View style={styles.roleHeader}>
        <View style={[
          styles.roleIconContainer,
          item.role_type === 1 && styles.employeeIconContainer,
          item.role_type === 2 && styles.managerIconContainer,
          item.role_type === 4 && styles.superAdminIconContainer,
        ]}>
          <MaterialCommunityIcons
            name={
              item.role_type === 1 ? "account" :
              item.role_type === 2 ? "account-tie" :
              "shield-account"
            }
            size={isTablet ? 28 : 24}
            color={
              item.role_type === 1 ? "#C084FC" :
              item.role_type === 2 ? "#8B5CF6" :
              "#10B981"
            }
          />
        </View>
        <View style={styles.roleInfo}>
          <View style={styles.roleTitleRow}>
            <Text style={[styles.roleName, isTablet && styles.roleNameTablet]}>{item.role_name}</Text>
            {item.is_system_role && (
              <View style={styles.systemBadge}>
                <MaterialCommunityIcons name="shield-check" size={12} color="#FFFFFF" />
                <Text style={styles.systemBadgeText}>System</Text>
              </View>
            )}
          </View>
          <Text style={styles.roleDescription} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>
          <View style={styles.roleMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="layers" size={12} color="#64748B" />
              <Text style={styles.metaText}>
                {item.role_type === 1 ? 'Employee' :
                 item.role_type === 2 ? 'Manager' :
                 'Super Admin'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="chart-line" size={12} color="#64748B" />
              <Text style={styles.metaText}>Level {item.role_level}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar" size={12} color="#64748B" />
              <Text style={styles.metaText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.roleActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleRoleClick(item)}
          disabled={loadingRoleDetails}
        >
          <MaterialCommunityIcons name="eye" size={16} color="#64748B" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditRole(item)}
          disabled={item.is_system_role}
        >
          <MaterialCommunityIcons name="pencil" size={16} color="#64748B" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteRole(item)}
          disabled={item.is_system_role || deleteRoleMutation.isPending}
        >
          <MaterialCommunityIcons name="delete" size={16} color="#EF4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <View style={isTablet && styles.headerContentTablet}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>Company Role Management</Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            Manage all roles and permissions • {totalRoles} total roles
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, isTablet && styles.searchContainerTablet]}>
        <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
        <TextInput
          style={[styles.searchInput, isTablet && styles.searchInputTablet]}
          placeholder="Search roles by name or description..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
        <TouchableOpacity
          style={[styles.statItem, selectedRoleType === 'all' && styles.statItemSelected]}
          onPress={() => setSelectedRoleType('all')}
        >
          <MaterialCommunityIcons name="layers" size={16} color={selectedRoleType === 'all' ? '#8B5CF6' : '#64748B'} />
          <Text style={[styles.statCount, selectedRoleType === 'all' && styles.statCountSelected]}>
            {totalRoles}
          </Text>
          <Text style={[styles.statLabel, selectedRoleType === 'all' && styles.statLabelSelected]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statItem, selectedRoleType === 'employee' && styles.statItemSelected]}
          onPress={() => setSelectedRoleType('employee')}
        >
          <MaterialCommunityIcons name="account" size={16} color={selectedRoleType === 'employee' ? '#C084FC' : '#64748B'} />
          <Text style={[styles.statCount, selectedRoleType === 'employee' && styles.statCountSelected]}>
            {employeeRoles}
          </Text>
          <Text style={[styles.statLabel, selectedRoleType === 'employee' && styles.statLabelSelected]}>
            Employee
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statItem, selectedRoleType === 'manager' && styles.statItemSelected]}
          onPress={() => setSelectedRoleType('manager')}
        >
          <MaterialCommunityIcons name="account-tie" size={16} color={selectedRoleType === 'manager' ? '#8B5CF6' : '#64748B'} />
          <Text style={[styles.statCount, selectedRoleType === 'manager' && styles.statCountSelected]}>
            {managerRoles}
          </Text>
          <Text style={[styles.statLabel, selectedRoleType === 'manager' && styles.statLabelSelected]}>
            Manager
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statItem, selectedRoleType === 'super_admin' && styles.statItemSelected]}
          onPress={() => setSelectedRoleType('super_admin')}
        >
          <MaterialCommunityIcons name="shield-account" size={16} color={selectedRoleType === 'super_admin' ? '#10B981' : '#64748B'} />
          <Text style={[styles.statCount, selectedRoleType === 'super_admin' && styles.statCountSelected]}>
            {superAdminRoles}
          </Text>
          <Text style={[styles.statLabel, selectedRoleType === 'super_admin' && styles.statLabelSelected]}>
            Super Admin
          </Text>
        </TouchableOpacity>
      </View>

      {/* Roles List */}
      <FlatList
        data={rolesToDisplay}
        renderItem={renderRoleItem}
        keyExtractor={(item: Role) => item.admin_role_id}
        contentContainerStyle={[
          styles.rolesList,
          isTablet && styles.rolesListTablet,
          rolesToDisplay.length === 0 && styles.emptyListContainer,
        ]}
        numColumns={isLargeTablet ? 3 : (isTablet ? 2 : 1)}
        columnWrapperStyle={(isTablet || isLargeTablet) && styles.rolesGridTablet}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
          />
        }
        ListEmptyComponent={
          isLoadingRoles ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />
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
              <MaterialCommunityIcons name="shield-account-outline" size={isTablet ? 100 : 80} color="#CBD5E1" />
              <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
                No roles found
              </Text>
              <Text style={[styles.emptySubtext, isTablet && styles.emptySubtextTablet]}>
                {searchQuery ? 'Try a different search term' : 'Create your first role'}
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, isTablet && styles.fabTablet]}
        onPress={() => setCreateModalVisible(true)}
      >
        <MaterialCommunityIcons name="plus" size={isTablet ? 28 : 24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modals */}
      <CreateRoleModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSave={handleCreateRole}
        isCreating={createEmployeeRoleMutation.isPending || createManagerRoleMutation.isPending}
        availableDepartments={availableDepartments}
      />

      <UpdateRoleModal
        visible={isUpdateModalVisible}
        onClose={() => {
          setIsUpdateModalVisible(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        onUpdate={handleUpdateRole}
        isUpdating={updateRoleMutation.isPending}
        availableDepartments={availableDepartments}
      />

      <RoleDetailsModal
        visible={isRoleDetailsModalVisible}
        onClose={() => {
          setIsRoleDetailsModalVisible(false);
          setSelectedRoleDetails(null);
        }}
        roleDetails={selectedRoleDetails}
        isLoading={loadingRoleDetails}
      />
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 12,
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
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 16,
  },
  headerContentTablet: {
    flex: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    padding: 0,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    paddingVertical: 8,
    borderRadius: 6,
  },
  statItemSelected: {
    backgroundColor: '#F5F3FF',
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
  },
  statCountSelected: {
    color: '#8B5CF6',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  statLabelSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  rolesList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
    minWidth: isLargeTablet ? '31%' : '48%',
    marginBottom: 16,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeIconContainer: {
    backgroundColor: '#FAF5FF',
  },
  managerIconContainer: {
    backgroundColor: '#F5F3FF',
  },
  superAdminIconContainer: {
    backgroundColor: '#D1FAE5',
  },
  roleInfo: {
    flex: 1,
    marginRight: 12,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
  },
  roleNameTablet: {
    fontSize: 18,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  systemBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  roleDescription: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 16,
  },
  roleMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  roleActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewButton: {
    backgroundColor: '#F1F5F9',
  },
  editButton: {
    backgroundColor: '#F1F5F9',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  fabTablet: {
    width: 64,
    height: 64,
    borderRadius: 32,
    bottom: 24,
    right: 24,
  },
  loader: {
    marginTop: 60,
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
    backgroundColor: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
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
  // Create Modal Styles
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  createModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: height * 0.9,
    width: '100%',
  },
  createModalContentTablet: {
    maxHeight: height * 0.9,
    width: isLargeTablet ? '70%' : (isTablet ? '80%' : '100%'),
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  createModalTitleTablet: {
    fontSize: 24,
  },
  createModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  createModalSubtitleTablet: {
    fontSize: 14,
    marginTop: 4,
  },
  createModalBody: {
    padding: 20,
    maxHeight: height * 0.7,
  },
  createModalSafeFooter: {
    backgroundColor: '#FFFFFF',
  },
  createModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  roleTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  roleTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  roleTypeOptionSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  roleTypeTextSelected: {
    color: '#8B5CF6',
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
    width: isLargeTablet ? '23%' : '31%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
  },
  departmentItemSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
  originalDepartmentItem: {
    borderColor: '#10B981',
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
    color: '#8B5CF6',
    fontWeight: '600',
  },
  originalDepartmentName: {
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
  originalBadge: {
    fontSize: 10,
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
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
  managerInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  managerInfoContent: {
    flex: 1,
  },
  managerInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  managerInfoText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  permissionsButtonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',        // ✅ KEY FIX
  },  permissionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    minWidth: 160,
    alignSelf: 'flex-start',
  },
  permissionsButtonTablet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
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
    marginTop: 8,
  },
  departmentSummary: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
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
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
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
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 6,
    minHeight: 48,
  },
  submitButtonTablet: {
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
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
  // Permission Modal Styles
  permissionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  permissionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: height * 0.9,
    width: '100%',
  },
  permissionModalContentTablet: {
    maxHeight: height * 0.9,
    width: isLargeTablet ? '70%' : (isTablet ? '80%' : '100%'),
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
  permissionModalSafeFooter: {
    backgroundColor: '#FFFFFF',
  },
  permissionModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
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
    color: '#8B5CF6',
    fontWeight: '600',
  },
  managerPermissionInfo: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  managerPermissionText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  loadingPermissions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingTextLarge: {
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
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
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
    color: '#8B5CF6',
    fontWeight: '500',
  },
  permissionsCount: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'right',
  },
  // Update Modal Styles
  updateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  updateModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: height * 0.9,
    width: '100%',
  },
  updateModalContentTablet: {
    maxHeight: height * 0.9,
    width: isLargeTablet ? '70%' : (isTablet ? '80%' : '100%'),
  },
  updateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  updateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  updateModalTitleTablet: {
    fontSize: 24,
  },
  updateModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  updateModalSubtitleTablet: {
    fontSize: 14,
    marginTop: 4,
  },
  updateModalBody: {
    padding: 20,
    maxHeight: height * 0.7,
  },
  updateModalSafeFooter: {
    backgroundColor: '#FFFFFF',
  },
  updateModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingRoleText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  // Role Details Modal Styles
  roleDetailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  roleDetailsModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: height * 0.9,
    width: '100%',
  },
  roleDetailsModalContentTablet: {
    maxHeight: height * 0.9,
    width: isLargeTablet ? '70%' : (isTablet ? '80%' : '100%'),
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
    color: '#8B5CF6',
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
  roleDetailsModalSafeFooter: {
    backgroundColor: '#FFFFFF',
  },
  roleDetailsModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
    backgroundColor: '#8B5CF6',
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
    color: '#8B5CF6',
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
  permissionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  permissionMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
});

export default CompanyManagementScreen;