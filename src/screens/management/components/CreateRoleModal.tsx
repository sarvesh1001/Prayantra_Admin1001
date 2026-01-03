import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Department, CreateEmployeeRoleRequest, CreateManagerRoleRequest, DepartmentPermissions } from '@/types';
import { useToast } from '@/components/Toast';
import { api } from '@/services/api';
import PermissionSelectionModal from './PermissionSelectionModal';
import styles from '../styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

interface CreateRoleModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (roleType: 'employee' | 'manager', data: any) => void;
  isCreating: boolean;
  availableDepartments: Department[];
}

interface DepartmentListItem {
  item: Department;
}

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  visible,
  onClose,
  onSave,
  isCreating,
  availableDepartments,
}) => {
  const { showToast } = useToast();
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
        ? rawPermissions.map((p: any) => p.permission_name)
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

export default CreateRoleModal;