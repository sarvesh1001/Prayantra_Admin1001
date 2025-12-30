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
  Dimensions,
  Platform,
  RefreshControl,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { api } from '@/services/api';
import { Role, Department, Permission, RoleDetailsResponse } from '@/types';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isSmallScreen = width < 375;

const CompanyManagementScreen = () => {
  const { adminInfo } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleDetails, setRoleDetails] = useState<RoleDetailsResponse['data'] | null>(null);
  const [isDetailsModalVisible, setDetailsModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isDepartmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [isPermissionsModalVisible, setPermissionsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editForm, setEditForm] = useState({
    role_name: '',
    description: '',
    add_departments: [] as string[],
    remove_departments: [] as string[],
    add_permissions: [] as string[],
    remove_permissions: [] as string[],
    replace_permissions: [] as string[],
  });
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

  // Fetch all roles
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => api.getAllRoles({ limit: 50, offset: 0 }),
  });

  // Fetch role details
  const {
    data: detailsData,
    isLoading: isLoadingDetails,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: ['roleDetails', selectedRole?.admin_role_id],
    queryFn: () => selectedRole ? api.getRoleDetails(selectedRole.admin_role_id) : null,
    enabled: !!selectedRole && isDetailsModalVisible,
  });

  // Fetch role departments
  const {
    data: roleDepartmentsData,
    refetch: refetchRoleDepartments,
  } = useQuery({
    queryKey: ['roleDepartments', selectedRole?.admin_role_id],
    queryFn: () => selectedRole ? api.getRoleDepartments(selectedRole.admin_role_id) : null,
    enabled: !!selectedRole && isDepartmentModalVisible,
  });

  // Fetch admin's departments
  const {
    data: adminDepartmentsData,
  } = useQuery({
    queryKey: ['adminDepartments'],
    queryFn: () => adminInfo ? api.getAdminDepartments(adminInfo.admin_id) : null,
    enabled: !!adminInfo,
  });

  // Mutations
  const searchMutation = useMutation({
    mutationFn: (query: string) => api.searchRoles(query, { limit: 50, offset: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => api.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      setDeleteModalVisible(false);
      showToast('success', 'Role deleted successfully');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.message || 'Failed to delete role');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: any }) => api.updateRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      queryClient.invalidateQueries({ queryKey: ['roleDetails', selectedRole?.admin_role_id] });
      queryClient.invalidateQueries({ queryKey: ['roleDepartments', selectedRole?.admin_role_id] });
      setEditModalVisible(false);
      showToast('success', 'Role updated successfully');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.message || 'Failed to update role');
    },
  });

  const assignDepartmentMutation = useMutation({
    mutationFn: ({ roleId, deptId }: { roleId: string; deptId: string }) => 
      api.assignDepartmentToRole(roleId, deptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleDetails', selectedRole?.admin_role_id] });
      queryClient.invalidateQueries({ queryKey: ['roleDepartments', selectedRole?.admin_role_id] });
      showToast('success', 'Department assigned successfully');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.message || 'Failed to assign department');
    },
  });

  const removeDepartmentMutation = useMutation({
    mutationFn: ({ roleId, deptId }: { roleId: string; deptId: string }) => 
      api.removeDepartmentFromRole(roleId, deptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleDetails', selectedRole?.admin_role_id] });
      queryClient.invalidateQueries({ queryKey: ['roleDepartments', selectedRole?.admin_role_id] });
      showToast('success', 'Department removed successfully');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.message || 'Failed to remove department');
    },
  });

  // Handlers
  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    } else {
      refetchRoles();
    }
  };

  const handleViewDetails = async (role: Role) => {
    setSelectedRole(role);
    setDetailsModalVisible(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditForm({
      role_name: role.role_name,
      description: role.description,
      add_departments: [],
      remove_departments: [],
      add_permissions: [],
      remove_permissions: [],
      replace_permissions: [],
    });
    setEditModalVisible(true);
  };

  const handleManageDepartments = (role: Role) => {
    setSelectedRole(role);
    setDepartmentModalVisible(true);
  };

  const handleViewPermissions = (role: Role) => {
    setSelectedRole(role);
    setPermissionsModalVisible(true);
  };

  const handleDeleteRole = () => {
    if (selectedRole && !selectedRole.is_system_role) {
      deleteRoleMutation.mutate(selectedRole.admin_role_id);
    } else {
      showToast('error', 'System roles cannot be deleted');
    }
  };

  const handleUpdateRole = () => {
    if (selectedRole) {
      const updateData: any = {};
      if (editForm.role_name !== selectedRole.role_name) updateData.role_name = editForm.role_name;
      if (editForm.description !== selectedRole.description) updateData.description = editForm.description;
      if (editForm.add_departments.length > 0) updateData.add_departments = editForm.add_departments;
      if (editForm.remove_departments.length > 0) updateData.remove_departments = editForm.remove_departments;
      if (editForm.add_permissions.length > 0) updateData.add_permissions = editForm.add_permissions;
      if (editForm.remove_permissions.length > 0) updateData.remove_permissions = editForm.remove_permissions;
      if (editForm.replace_permissions.length > 0) updateData.replace_permissions = editForm.replace_permissions;

      if (Object.keys(updateData).length > 0) {
        updateRoleMutation.mutate({ roleId: selectedRole.admin_role_id, data: updateData });
      } else {
        setEditModalVisible(false);
        showToast('info', 'No changes made');
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    refetchRoles().finally(() => setRefreshing(false));
  };

  const handleAssignDepartment = (deptId: string) => {
    if (selectedRole) {
      assignDepartmentMutation.mutate({ roleId: selectedRole.admin_role_id, deptId });
    }
  };

  const handleRemoveDepartment = (deptId: string) => {
    if (selectedRole) {
      removeDepartmentMutation.mutate({ roleId: selectedRole.admin_role_id, deptId });
    }
  };

  // Helper functions
  const getRoleIcon = (roleType: number) => {
    switch (roleType) {
      case 1: return 'account';
      case 2: return 'account-tie';
      case 4: return 'shield-crown';
      default: return 'account';
    }
  };

  const getRoleColor = (roleType: number) => {
    switch (roleType) {
      case 1: return '#C084FC'; // Employee
      case 2: return '#A855F7'; // Manager
      case 4: return '#9333EA'; // Super Admin
      default: return '#64748B';
    }
  };

  const getRoleTypeText = (roleType: number) => {
    switch (roleType) {
      case 1: return 'Employee';
      case 2: return 'Manager';
      case 4: return 'Super Admin';
      default: return 'Unknown';
    }
  };

  const getPermissionCountByModule = (moduleCode: string) => {
    if (!detailsData?.data?.permissions) return 0;
    return detailsData.data.permissions.filter((p: Permission) => p.module === moduleCode).length;
  };

  // Filter admin's accessible departments
  const accessibleDepartments = adminDepartmentsData?.data?.departments || [];
  const accessibleDepartmentIds = accessibleDepartments.map((dept: Department) => dept.system_department_id);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <View style={isTablet && styles.headerContentTablet}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>Company Role Management</Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            Manage all roles, departments, and permissions across the company
          </Text>
        </View>
        
        <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-group" size={isTablet ? 20 : 16} color="#64748B" />
            <Text style={[styles.statText, isTablet && styles.statTextTablet]}>
              {rolesData?.data?.meta?.total || 0} Total Roles
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="shield-account" size={isTablet ? 20 : 16} color="#64748B" />
            <Text style={[styles.statText, isTablet && styles.statTextTablet]}>
              {rolesData?.data?.roles?.filter((r: Role) => r.role_type === 4)?.length || 0} Super Admins
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, isTablet && styles.searchContainerTablet]}>
        <MaterialCommunityIcons name="magnify" size={isTablet ? 24 : 20} color="#64748B" />
        <TextInput
          style={[styles.searchInput, isTablet && styles.searchInputTablet]}
          placeholder="Search roles by name or type..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          placeholderTextColor="#94A3B8"
          returnKeyType="search"
        />
        <TouchableOpacity onPress={handleSearch} style={[styles.searchButton, isTablet && styles.searchButtonTablet]}>
          <MaterialCommunityIcons name="magnify" size={isTablet ? 24 : 20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Roles List */}
      <FlatList
        data={rolesData?.data?.roles || []}
        keyExtractor={(item) => item.admin_role_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#9333EA']}
            tintColor="#9333EA"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="domain" size={isTablet ? 80 : 64} color="#CBD5E1" />
            <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>No roles found</Text>
            <Text style={[styles.emptySubtext, isTablet && styles.emptySubtextTablet]}>
              Create roles from Employee or Manager management
            </Text>
          </View>
        }
        ListHeaderComponent={
          isLoadingRoles ? (
            <ActivityIndicator size="large" color="#9333EA" style={styles.loader} />
          ) : rolesError ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={isTablet ? 64 : 48} color="#EF4444" />
              <Text style={[styles.errorText, isTablet && styles.errorTextTablet]}>Failed to load roles</Text>
              <TouchableOpacity style={[styles.retryButton, isTablet && styles.retryButtonTablet]} onPress={() => refetchRoles()}>
                <Text style={[styles.retryButtonText, isTablet && styles.retryButtonTextTablet]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        numColumns={isTablet ? 2 : 1}
        renderItem={({ item: role }) => {
          const roleColor = getRoleColor(role.role_type);
          
          return (
            <TouchableOpacity
              style={[styles.roleCard, isTablet && styles.roleCardTablet]}
              onPress={() => handleViewDetails(role)}
            >
              <View style={styles.roleCardHeader}>
                <View style={[styles.roleIconContainer, { backgroundColor: `${roleColor}15` }]}>
                  <MaterialCommunityIcons
                    name={getRoleIcon(role.role_type)}
                    size={isTablet ? 28 : 24}
                    color={roleColor}
                  />
                </View>
                
                <View style={styles.roleInfo}>
                  <Text style={[styles.roleName, isTablet && styles.roleNameTablet]}>{role.role_name}</Text>
                  <View style={styles.roleMeta}>
                    <View style={[styles.roleTypeBadge, { backgroundColor: `${roleColor}15` }]}>
                      <Text style={[styles.roleTypeText, { color: roleColor }, isTablet && styles.roleTypeTextTablet]}>
                        {getRoleTypeText(role.role_type)}
                      </Text>
                    </View>
                    {role.is_system_role && (
                      <View style={styles.systemBadge}>
                        <Text style={[styles.systemBadgeText, isTablet && styles.systemBadgeTextTablet]}>System</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              
              <Text style={[styles.roleDescription, isTablet && styles.roleDescriptionTablet]} numberOfLines={2}>
                {role.description}
              </Text>
              
              <View style={styles.roleCardFooter}>
                <Text style={[styles.roleLevel, isTablet && styles.roleLevelTablet]}>Level {role.role_level}</Text>
                <Text style={[styles.roleDate, isTablet && styles.roleDateTablet]}>
                  {new Date(role.created_at).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, isTablet && styles.actionButtonTablet]}
                  onPress={() => handleEditRole(role)}
                >
                  <MaterialCommunityIcons name="pencil" size={isTablet ? 20 : 16} color="#64748B" />
                  <Text style={[styles.actionButtonText, isTablet && styles.actionButtonTextTablet]}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, isTablet && styles.actionButtonTablet]}
                  onPress={() => handleManageDepartments(role)}
                >
                  <MaterialCommunityIcons name="office-building" size={isTablet ? 20 : 16} color="#64748B" />
                  <Text style={[styles.actionButtonText, isTablet && styles.actionButtonTextTablet]}>Departments</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, isTablet && styles.actionButtonTablet]}
                  onPress={() => handleViewPermissions(role)}
                >
                  <MaterialCommunityIcons name="shield-key" size={isTablet ? 20 : 16} color="#64748B" />
                  <Text style={[styles.actionButtonText, isTablet && styles.actionButtonTextTablet]}>Permissions</Text>
                </TouchableOpacity>
                
                {!role.is_system_role && (
                  <TouchableOpacity
                    style={[styles.deleteButton, isTablet && styles.deleteButtonTablet]}
                    onPress={() => {
                      setSelectedRole(role);
                      setDeleteModalVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="trash-can" size={isTablet ? 20 : 16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Role Details Modal */}
      <Modal
        visible={isDetailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            {selectedRole && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalRoleInfo}>
                    <View style={[
                      styles.modalRoleIcon,
                      { backgroundColor: `${getRoleColor(selectedRole.role_type)}15` }
                    ]}>
                      <MaterialCommunityIcons
                        name={getRoleIcon(selectedRole.role_type)}
                        size={isTablet ? 40 : 32}
                        color={getRoleColor(selectedRole.role_type)}
                      />
                    </View>
                    <View style={styles.modalRoleTextContainer}>
                      <Text style={[styles.modalRoleName, isTablet && styles.modalRoleNameTablet]}>
                        {selectedRole.role_name}
                      </Text>
                      <Text style={[styles.modalRoleType, isTablet && styles.modalRoleTypeTablet]}>
                        {getRoleTypeText(selectedRole.role_type)} Role
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, isTablet && styles.detailLabelTablet]}>Description</Text>
                    <Text style={[styles.detailValue, isTablet && styles.detailValueTablet]}>
                      {selectedRole.description}
                    </Text>
                  </View>

                  <View style={[styles.detailRow, isTablet && styles.detailRowTablet]}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, isTablet && styles.detailLabelTablet]}>Role Level</Text>
                      <Text style={[styles.detailValue, isTablet && styles.detailValueTablet]}>
                        {selectedRole.role_level}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, isTablet && styles.detailLabelTablet]}>System Role</Text>
                      <Text style={[styles.detailValue, isTablet && styles.detailValueTablet]}>
                        {selectedRole.is_system_role ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailRow, isTablet && styles.detailRowTablet]}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, isTablet && styles.detailLabelTablet]}>Created</Text>
                      <Text style={[styles.detailValue, isTablet && styles.detailValueTablet]}>
                        {new Date(selectedRole.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, isTablet && styles.detailLabelTablet]}>Last Updated</Text>
                      <Text style={[styles.detailValue, isTablet && styles.detailValueTablet]}>
                        {new Date(selectedRole.updated_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {/* Departments Section */}
                  {detailsData && detailsData.data && (
                    <View style={styles.detailSection}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.detailLabel, isTablet && styles.detailLabelTablet]}>Departments</Text>
                        <Text style={styles.sectionCount}>
                          {detailsData.data.departments?.length || 0} available
                        </Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                        {detailsData.data.departments?.slice(0, 5).map((dept: Department) => (
                          <View key={dept.system_department_id} style={styles.chip}>
                            <Text style={styles.chipText}>{dept.name}</Text>
                          </View>
                        ))}
                        {detailsData.data.departments && detailsData.data.departments.length > 5 && (
                          <View style={styles.chip}>
                            <Text style={styles.chipText}>+{detailsData.data.departments.length - 5} more</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}

                  {/* Permissions Section */}
                  {detailsData && detailsData.data && (
                    <View style={styles.detailSection}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.detailLabel, isTablet && styles.detailLabelTablet]}>Permissions</Text>
                        <Text style={styles.sectionCount}>
                          {detailsData.data.permissions?.length || 0} available
                        </Text>
                      </View>
                      <Text style={[styles.detailValue, isTablet && styles.detailValueTablet]}>
                        View all permissions in the permissions modal
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, isTablet && styles.detailLabelTablet]}>Role ID</Text>
                    <Text style={[styles.detailValue, styles.roleIdText, isTablet && styles.roleIdTextTablet]}>
                      {selectedRole.admin_role_id}
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, isTablet && styles.modalActionButtonTablet]}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      handleManageDepartments(selectedRole);
                    }}
                  >
                    <MaterialCommunityIcons name="office-building" size={20} color="#9333EA" />
                    <Text style={[styles.modalActionButtonText, isTablet && styles.modalActionButtonTextTablet]}>
                      Manage Departments
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.closeModalButton, isTablet && styles.closeModalButtonTablet]}
                    onPress={() => setDetailsModalVisible(false)}
                  >
                    <Text style={[styles.closeModalButtonText, isTablet && styles.closeModalButtonTextTablet]}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isTablet && styles.modalTitleTablet]}>Edit Role</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isTablet && styles.formLabelTablet]}>Role Name</Text>
                <TextInput
                  style={[styles.formInput, isTablet && styles.formInputTablet]}
                  value={editForm.role_name}
                  onChangeText={(text) => setEditForm({...editForm, role_name: text})}
                  placeholder="Enter role name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isTablet && styles.formLabelTablet]}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea, isTablet && styles.formInputTablet]}
                  value={editForm.description}
                  onChangeText={(text) => setEditForm({...editForm, description: text})}
                  placeholder="Enter role description"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isTablet && styles.formLabelTablet]}>Add Departments</Text>
                <Text style={[styles.formHelpText, isTablet && styles.formHelpTextTablet]}>
                  Enter department names separated by commas
                </Text>
                <TextInput
                  style={[styles.formInput, isTablet && styles.formInputTablet]}
                  value={editForm.add_departments.join(', ')}
                  onChangeText={(text) => setEditForm({...editForm, add_departments: text.split(',').map(d => d.trim()).filter(d => d)})}
                  placeholder="HR, Sales, Marketing"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isTablet && styles.formLabelTablet]}>Remove Departments</Text>
                <Text style={[styles.formHelpText, isTablet && styles.formHelpTextTablet]}>
                  Enter department names to remove
                </Text>
                <TextInput
                  style={[styles.formInput, isTablet && styles.formInputTablet]}
                  value={editForm.remove_departments.join(', ')}
                  onChangeText={(text) => setEditForm({...editForm, remove_departments: text.split(',').map(d => d.trim()).filter(d => d)})}
                  placeholder="Operations, Logistics"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.closeModalButton, isTablet && styles.closeModalButtonTablet]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.closeModalButtonText, isTablet && styles.closeModalButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isTablet && styles.saveButtonTablet]}
                onPress={handleUpdateRole}
                disabled={updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.saveButtonText, isTablet && styles.saveButtonTextTablet]}>
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Department Management Modal */}
      <Modal
        visible={isDepartmentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDepartmentModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet, { maxHeight: height * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                Manage Departments - {selectedRole?.role_name}
              </Text>
              <TouchableOpacity onPress={() => setDepartmentModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalSubtitle, isTablet && styles.modalSubtitleTablet]}>
                Current Departments ({roleDepartmentsData?.data?.length || 0})
              </Text>
              
              {roleDepartmentsData?.data && roleDepartmentsData.data.length > 0 ? (
                <View style={styles.departmentList}>
                  {roleDepartmentsData.data.map((dept: Department) => (
                    <View key={dept.system_department_id} style={styles.departmentItem}>
                      <View style={styles.departmentInfo}>
                        <MaterialCommunityIcons name="office-building" size={20} color="#9333EA" />
                        <View style={styles.departmentText}>
                          <Text style={[styles.departmentName, isTablet && styles.departmentNameTablet]}>
                            {dept.name}
                          </Text>
                          <Text style={[styles.departmentModule, isTablet && styles.departmentModuleTablet]}>
                            {dept.module_code}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveDepartment(dept.system_department_id)}
                        disabled={removeDepartmentMutation.isPending}
                      >
                        <MaterialCommunityIcons name="minus-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.noDataText, isTablet && styles.noDataTextTablet]}>
                  No departments assigned to this role
                </Text>
              )}

              <Text style={[styles.modalSubtitle, isTablet && styles.modalSubtitleTablet, { marginTop: 24 }]}>
                Available Departments ({accessibleDepartments.length})
              </Text>
              
              {accessibleDepartments.length > 0 ? (
                <View style={styles.departmentList}>
                  {accessibleDepartments.map((dept: Department) => {
                    const isAssigned = roleDepartmentsData?.data?.some(
                      (assignedDept: Department) => assignedDept.system_department_id === dept.system_department_id
                    );
                    
                    if (isAssigned) return null;
                    
                    return (
                      <View key={dept.system_department_id} style={styles.departmentItem}>
                        <View style={styles.departmentInfo}>
                          <MaterialCommunityIcons name="office-building-outline" size={20} color="#64748B" />
                          <View style={styles.departmentText}>
                            <Text style={[styles.departmentName, isTablet && styles.departmentNameTablet]}>
                              {dept.name}
                            </Text>
                            <Text style={[styles.departmentModule, isTablet && styles.departmentModuleTablet]}>
                              {dept.module_code}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => handleAssignDepartment(dept.system_department_id)}
                          disabled={assignDepartmentMutation.isPending}
                        >
                          <MaterialCommunityIcons name="plus-circle" size={20} color="#10B981" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.noDataText, isTablet && styles.noDataTextTablet]}>
                  No available departments
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.closeModalButton, isTablet && styles.closeModalButtonTablet]}
                onPress={() => setDepartmentModalVisible(false)}
              >
                <Text style={[styles.closeModalButtonText, isTablet && styles.closeModalButtonTextTablet]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        visible={isPermissionsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPermissionsModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet, { maxHeight: height * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                Permissions - {selectedRole?.role_name}
              </Text>
              <TouchableOpacity onPress={() => setPermissionsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {isLoadingDetails ? (
                <ActivityIndicator size="large" color="#9333EA" style={styles.loader} />
              ) : detailsData?.data ? (
                <View>
                  {Array.from(new Set(detailsData.data.permissions?.map((p: Permission) => p.module) || [])).map((module) => (
                    <View key={module as string} style={styles.permissionSection}>
                      <View style={styles.permissionSectionHeader}>
                        <Text style={[styles.permissionModuleName, isTablet && styles.permissionModuleNameTablet]}>
                          {(module as string).charAt(0).toUpperCase() + (module as string).slice(1)}
                        </Text>
                        <Text style={styles.permissionCount}>
                          {detailsData.data.permissions?.filter((p: Permission) => p.module === module).length || 0} permissions
                        </Text>
                      </View>
                      
                      <View style={styles.permissionGrid}>
                        {detailsData.data.permissions
                          ?.filter((p: Permission) => p.module === module)
                          .slice(0, 5)
                          .map((permission: Permission) => (
                            <View key={permission.permission_id} style={styles.permissionChip}>
                              <MaterialCommunityIcons name="shield-key" size={16} color="#9333EA" />
                              <Text style={[styles.permissionName, isTablet && styles.permissionNameTablet]}>
                                {permission.permission_name}
                              </Text>
                            </View>
                          ))}
                        
                        {detailsData.data.permissions?.filter((p: Permission) => p.module === module).length > 5 && (
                          <View style={styles.moreChip}>
                            <Text style={styles.moreChipText}>
                              +{detailsData.data.permissions.filter((p: Permission) => p.module === module).length - 5} more
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.noDataText, isTablet && styles.noDataTextTablet]}>
                  No permissions data available
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.closeModalButton, isTablet && styles.closeModalButtonTablet]}
                onPress={() => setPermissionsModalVisible(false)}
              >
                <Text style={[styles.closeModalButtonText, isTablet && styles.closeModalButtonTextTablet]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.deleteModalContainer}>
          <View style={[styles.deleteModalContent, isTablet && styles.deleteModalContentTablet]}>
            <View style={styles.deleteModalIcon}>
              <MaterialCommunityIcons name="alert-circle" size={isTablet ? 64 : 48} color="#EF4444" />
            </View>
            
            <Text style={[styles.deleteModalTitle, isTablet && styles.deleteModalTitleTablet]}>Delete Role</Text>
            
            <Text style={[styles.deleteModalText, isTablet && styles.deleteModalTextTablet]}>
              Are you sure you want to delete "{selectedRole?.role_name}"? 
              This action cannot be undone.
            </Text>

            {selectedRole?.is_system_role && (
              <View style={styles.warningBox}>
                <MaterialCommunityIcons name="alert" size={20} color="#D97706" />
                <Text style={styles.warningText}>System roles cannot be deleted</Text>
              </View>
            )}

            <View style={[styles.deleteModalButtons, isTablet && styles.deleteModalButtonsTablet]}>
              <TouchableOpacity
                style={[styles.deleteCancelButton, isTablet && styles.deleteCancelButtonTablet]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[styles.deleteCancelButtonText, isTablet && styles.deleteCancelButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              {!selectedRole?.is_system_role && (
                <TouchableOpacity
                  style={[
                    styles.deleteConfirmButton,
                    isTablet && styles.deleteConfirmButtonTablet,
                    deleteRoleMutation.isPending && styles.deleteConfirmButtonDisabled,
                  ]}
                  onPress={handleDeleteRole}
                  disabled={deleteRoleMutation.isPending}
                >
                  {deleteRoleMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.deleteConfirmButtonText, isTablet && styles.deleteConfirmButtonTextTablet]}>
                      Delete
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTablet: {
    paddingHorizontal: 24,
    paddingTop: 20,
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  statsContainerTablet: {
    marginTop: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
  },
  statTextTablet: {
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchContainerTablet: {
    margin: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    marginLeft: 8,
  },
  searchInputTablet: {
    paddingVertical: 12,
    fontSize: 16,
    marginLeft: 12,
  },
  searchButton: {
    backgroundColor: '#9333EA',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  searchButtonTablet: {
    padding: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loader: {
    marginTop: 40,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 40,
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
  },
  errorTextTablet: {
    fontSize: 18,
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: '#9333EA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  retryButtonTextTablet: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
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
    elevation: 1,
  },
  roleCardTablet: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  roleNameTablet: {
    fontSize: 18,
  },
  roleMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  roleTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleTypeTextTablet: {
    fontSize: 12,
  },
  systemBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  systemBadgeTextTablet: {
    fontSize: 11,
  },
  roleDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  roleDescriptionTablet: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
  },
  roleCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 12,
  },
  roleLevel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  roleLevelTablet: {
    fontSize: 12,
  },
  roleDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  roleDateTablet: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  actionButtonTablet: {
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  actionButtonTextTablet: {
    fontSize: 12,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonTablet: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  // Modal Styles
  modalContainer: {
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
    marginHorizontal: 'auto',
    width: isTablet ? '70%' : '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 22,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  modalSubtitleTablet: {
    fontSize: 16,
    marginBottom: 16,
  },
  modalRoleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalRoleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoleTextContainer: {
    flex: 1,
  },
  modalRoleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalRoleNameTablet: {
    fontSize: 22,
  },
  modalRoleType: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalRoleTypeTablet: {
    fontSize: 14,
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748B',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  detailRowTablet: {
    gap: 16,
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  detailLabelTablet: {
    fontSize: 14,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
  },
  detailValueTablet: {
    fontSize: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
  },
  roleIdText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  roleIdTextTablet: {
    fontSize: 12,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12,
  },
  closeModalButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  closeModalButtonTablet: {
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 52,
  },
  closeModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  closeModalButtonTextTablet: {
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#9333EA',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  saveButtonTablet: {
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 52,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextTablet: {
    fontSize: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    paddingVertical: 12,
    flex: 1,
  },
  modalActionButtonTablet: {
    borderRadius: 10,
    paddingVertical: 14,
  },
  modalActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9333EA',
  },
  modalActionButtonTextTablet: {
    fontSize: 16,
  },
  // Form Styles
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  formLabelTablet: {
    fontSize: 16,
    marginBottom: 6,
  },
  formHelpText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  formHelpTextTablet: {
    fontSize: 14,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
  },
  formInputTablet: {
    paddingVertical: 12,
    fontSize: 16,
    borderRadius: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Department Management Styles
  departmentList: {
    gap: 8,
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  departmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  departmentText: {
    flex: 1,
  },
  departmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  departmentNameTablet: {
    fontSize: 16,
  },
  departmentModule: {
    fontSize: 12,
    color: '#64748B',
  },
  departmentModuleTablet: {
    fontSize: 14,
  },
  addButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  // Permissions Styles
  permissionSection: {
    marginBottom: 20,
  },
  permissionSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionModuleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  permissionModuleNameTablet: {
    fontSize: 16,
  },
  permissionCount: {
    fontSize: 12,
    color: '#64748B',
  },
  permissionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  permissionName: {
    fontSize: 11,
    color: '#9333EA',
  },
  permissionNameTablet: {
    fontSize: 12,
  },
  moreChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moreChipText: {
    fontSize: 11,
    color: '#64748B',
  },
  noDataText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    padding: 20,
  },
  noDataTextTablet: {
    fontSize: 16,
    padding: 24,
  },
  // Delete Modal Styles
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalContentTablet: {
    padding: 24,
    borderRadius: 20,
    maxWidth: 500,
  },
  deleteModalIcon: {
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalTitleTablet: {
    fontSize: 22,
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteModalTextTablet: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    color: '#D97706',
    flex: 1,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteModalButtonsTablet: {
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  deleteCancelButtonTablet: {
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 52,
  },
  deleteCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  deleteCancelButtonTextTablet: {
    fontSize: 16,
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  deleteConfirmButtonTablet: {
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 52,
  },
  deleteConfirmButtonDisabled: {
    opacity: 0.7,
  },
  deleteConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteConfirmButtonTextTablet: {
    fontSize: 16,
  },
});

export default CompanyManagementScreen;