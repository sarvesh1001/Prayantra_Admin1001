import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Department, Role, UpdateRoleRequest, Permission } from '@/types';
import { useToast } from '@/components/Toast';
import { api } from '@/services/api';
import PermissionSelectionModal from './PermissionSelectionModal';
import styles from '../styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

interface UpdateRoleModalProps {
  visible: boolean;
  onClose: () => void;
  role: Role | null;
  onUpdate: (roleId: string, data: UpdateRoleRequest) => void;
  isUpdating: boolean;
  availableDepartments: Department[];
}

interface DepartmentListItem {
  item: Department;
}

const UpdateRoleModal: React.FC<UpdateRoleModalProps> = ({
  visible,
  onClose,
  role,
  onUpdate,
  isUpdating,
  availableDepartments,
}) => {
  const { showToast } = useToast();
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
        const permissionsByDept: Record<string, string[]> = {};
        
        const moduleToDeptName: Record<string, string> = {};
        departments.forEach((dept: Department) => {
          moduleToDeptName[dept.module_code] = dept.name;
        });
                
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
      setSelectedDepartments(prev => [...prev, department]);
      
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
  
    if (role.role_type === 1) {
      updateData.replace_permissions =
        Object.values(selectedPermissions).flat();
    }
  
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

export default UpdateRoleModal;