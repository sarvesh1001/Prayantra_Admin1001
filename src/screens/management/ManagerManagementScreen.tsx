import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { api } from '@/services/api';
import { 
  Role, 
  AdminRoleDetailsResponse,
  RoleDetails
} from '@/types';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

interface ManagerRolesResponse {
  meta: {
    count: number;
    role_type?: string;
    role_type_string?: string;
  };
  roles: Role[];
}

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

interface CreateManagerRoleRequest {
  role_name: string;
  description: string;
  department_names: string[];
}

interface RoleListItem {
  item: Role;
}

interface DepartmentListItem {
  item: Department;
}

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
                Manager Role Details
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
                      <Text style={styles.infoValue}>Manager</Text>
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
                      Assigned Departments ({roleDetails.departments.length})
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{roleDetails.departments.length}</Text>
                    </View>
                  </View>
                  <View style={styles.departmentsGrid}>
                    {roleDetails.departments.map((dept) => (
                      <View key={dept.system_department_id} style={styles.departmentChip}>
                        <MaterialCommunityIcons 
                          name="office-building-cog" 
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

                <View style={styles.managerNoteSection}>
                  <MaterialCommunityIcons name="shield-check" size={20} color="#8B5CF6" />
                  <Text style={styles.managerNoteText}>
                    Manager roles automatically receive all permissions for their assigned departments.
                  </Text>
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

const ManagerManagementScreen = () => {
  const { adminId } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isRoleDetailsModalVisible, setRoleDetailsModalVisible] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoleDetails, setSelectedRoleDetails] = useState<RoleDetails | null>(null);
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false);

  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ['managerRoles'],
    queryFn: async () => {
      const res = await api.getManagerRoles();
      return res.data.data;
    },
  });

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

  const createRoleMutation = useMutation({
    mutationFn: (roleData: CreateManagerRoleRequest) => 
      api.createManagerRole(roleData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['managerRoles'] });
      setCreateModalVisible(false);
      resetForm();
      showToast('success', response.data?.message || 'Manager role created successfully');
    },
    onError: (error: any) => {
      console.error('Create role error:', error);
      if (error.response?.status === 409) {
        showToast('error', 'Role name already exists');
      } else if (error.response?.status === 401) {
        showToast('error', 'Session expired. Please login again');
      } else if (error.response?.status === 403) {
        showToast('error', 'You do not have permission to create manager roles');
      } else {
        showToast('error', error.response?.data?.message || 'Failed to create role');
      }
    },
  });

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

  const handleRoleClick = (roleId: string) => {
    fetchRoleDetails(roleId);
  };

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
    setCreateModalVisible(false);
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

    const department_names = selectedDepartments.map(dept => dept.name);

    const roleData: CreateManagerRoleRequest = {
      role_name: roleName.trim(),
      description: description.trim(),
      department_names,
    };

    createRoleMutation.mutate(roleData);
  };

  const toggleDepartmentSelection = (department: Department) => {
    const departmentName = department.name;
    
    if (selectedDepartments.some(dept => dept.name === departmentName)) {
      setSelectedDepartments(prev => prev.filter(d => d.name !== departmentName));
    } else {
      setSelectedDepartments(prev => [...prev, department]);
    }
  };

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

  const renderRoleItem = ({ item }: RoleListItem) => (
    <TouchableOpacity onPress={() => handleRoleClick(item.admin_role_id)}>
      <View style={[styles.roleCard, isTablet && styles.roleCardTablet]}>
        <View style={styles.roleHeader}>
          <View style={[styles.roleIconContainer, styles.managerIconContainer]}>
            <MaterialCommunityIcons 
              name={item.is_system_role ? "shield-account" : "account-tie"} 
              size={isTablet ? 28 : 24} 
              color={item.is_system_role ? "#10B981" : "#8B5CF6"} 
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
              {item.is_system_role ? 'System Manager Role' : 'Manager Role'}
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <View style={isTablet && styles.headerContentTablet}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>Manager Role Management</Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            Manage manager roles and departments • {rolesData?.meta?.count || 0} roles
          </Text>
        </View>
      </View>

      <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="account-tie" size={20} color="#8B5CF6" />
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
          <MaterialCommunityIcons name="office-building-cog" size={20} color="#F59E0B" />
          <Text style={styles.statCount}>
            {selectedDepartments.length}
          </Text>
          <Text style={styles.statLabel}>Depts Selected</Text>
        </View>
      </View>

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
                Failed to load manager roles
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
              <MaterialCommunityIcons name="account-tie-outline" size={isTablet ? 100 : 80} color="#CBD5E1" />
              <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
                No manager roles found
              </Text>
              <Text style={[styles.emptySubtext, isTablet && styles.emptySubtextTablet]}>
                {searchQuery ? 'Try a different search term' : 'Create your first manager role'}
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

      <View style={[styles.footer, isTablet && styles.footerTablet]}>
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => {
            setSearchQuery('');
            refetchRoles();
            showToast('success', 'Manager roles refreshed successfully');
          }}
        >
          <View style={[styles.footerIconContainer, styles.refreshIconContainer]}>
            <MaterialCommunityIcons name="reload" size={isTablet ? 28 : 24} color="#8B5CF6" />
          </View>
          <Text style={styles.footerButtonText}>Refresh</Text>
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
                  Create Manager Role
                </Text>
                <Text style={[styles.modalSubtitle, isTablet && styles.modalSubtitleTablet]}>
                  Select departments for manager role
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
                  placeholder="e.g., Sales Manager, Operations Manager"
                  placeholderTextColor="#94A3B8"
                  editable={!createRoleMutation.isPending}
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
                  placeholder="Describe the manager role purpose and responsibilities..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={isTablet ? 4 : 3}
                  editable={!createRoleMutation.isPending}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                    Select Departments
                  </Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                  Departments for manager oversight • {selectedDepartments.length} selected
                </Text>
                
                {isLoadingDepartments ? (
                  <ActivityIndicator size="small" color="#8B5CF6" style={styles.smallLoader} />
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

              {selectedDepartments.length > 0 && (
                <View style={styles.summaryCard}>
                  <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="#8B5CF6" />
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryTitle}>Manager Role Summary</Text>
                    <View style={styles.summaryDetails}>
                      <Text style={styles.summaryText}>
                        • Departments: {selectedDepartments.length}
                      </Text>
                      <Text style={styles.summaryText}>
                        • Manager will receive: ALL permissions for selected departments
                      </Text>
                      <Text style={styles.summaryText}>
                        • Modules: {selectedDepartments.map(d => d.module_code).join(', ')}
                      </Text>
                      <Text style={styles.summaryText}>
                        • Role Type: Manager (Type 2)
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <SafeAreaView edges={['bottom']} style={styles.modalFooterSafe}>
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
                      <MaterialCommunityIcons
                        name="shield-check"
                        size={isTablet ? 22 : 18}
                        color="#FFFFFF"
                      />
                      <Text
                        style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {isTablet ? 'Create Manager Role' : 'Create Role'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>

          </View>
        </View>
      </Modal>

      <RoleDetailsModal
        visible={isRoleDetailsModalVisible}
        onClose={() => {
          setRoleDetailsModalVisible(false);
          setSelectedRoleDetails(null);
        }}
        roleDetails={selectedRoleDetails}
        isLoading={loadingRoleDetails}
      />
    </SafeAreaView>
  );
};

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
    marginTop: 12,        // ✅ ADD THIS
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsContainerTablet: {
    marginTop: 16,        // ✅ ADD THIS
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  managerIconContainer: {
    backgroundColor: '#F5F3FF',
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
    borderColor: '#8B5CF6',
  },
  createIconContainer: {
    backgroundColor: '#8B5CF6',
  },
  footerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
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
    minHeight: 48,          // ✅ prevents clipping
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
  managerNoteSection: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28, // ✅ prevents nav overlap
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  modalFooterSafe: {
    backgroundColor: '#FFFFFF',
  },    
  managerNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});

export default ManagerManagementScreen;