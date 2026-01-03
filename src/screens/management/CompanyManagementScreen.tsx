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
  CreateEmployeeRoleRequest,
  CreateManagerRoleRequest,
  Admin,
  AdminDetails,
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminStats,
  AdminHierarchy,
  AdminPhoneInfo,
} from '@/types';

// Components
import CreateRoleModal from './components/CreateRoleModal';
import UpdateRoleModal from './components/UpdateRoleModal';
import RoleDetailsModal from './components/RoleDetailsModal';
import RoleCard from './components/RoleCard';
import AdminCard from './components/AdminCard';
import CreateAdminModal from './components/CreateAdminModal';
import UpdateAdminModal from './components/UpdateAdminModal';
import AdminDetailsModal from './components/AdminDetailsModal';
import PhoneChangeModal from './components/PhoneChangeModal';
import MPINChangeModal from './components/MPINChangeModal';
import ReportsToModal from './components/ReportsToModal';

// Styles
import styles from './styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

// Main Company Management Screen Component
const CompanyManagementScreen = () => {
  const { adminId } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'roles' | 'admins'>('roles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleType, setSelectedRoleType] = useState<'all' | 'employee' | 'manager' | 'super_admin'>('all');
  const [selectedAdminType, setSelectedAdminType] = useState<'all' | 'employee' | 'manager' | 'super_admin'>('all');
  
  // Role Modals
  const [isCreateRoleModalVisible, setCreateRoleModalVisible] = useState(false);
  const [isUpdateRoleModalVisible, setIsUpdateRoleModalVisible] = useState(false);
  const [isRoleDetailsModalVisible, setIsRoleDetailsModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRoleDetails, setSelectedRoleDetails] = useState<RoleDetails | null>(null);
  
  // Admin Modals
  const [isCreateAdminModalVisible, setCreateAdminModalVisible] = useState(false);
  const [isUpdateAdminModalVisible, setIsUpdateAdminModalVisible] = useState(false);
  const [isAdminDetailsModalVisible, setIsAdminDetailsModalVisible] = useState(false);
  const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);
  const [isMPINModalVisible, setIsMPINModalVisible] = useState(false);
  const [isReportsToModalVisible, setIsReportsToModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [selectedAdminDetails, setSelectedAdminDetails] = useState<AdminDetails | null>(null);
  const [selectedAdminPhone, setSelectedAdminPhone] = useState<AdminPhoneInfo | null>(null);
  
  // Common States
  const [refreshing, setRefreshing] = useState(false);
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false);
  const [loadingAdminDetails, setLoadingAdminDetails] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminHierarchy, setAdminHierarchy] = useState<AdminHierarchy[]>([]);

  // Fetch all roles
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ['allRoles'],
    queryFn: async () => {
      const response = await api.getAllRoles({ limit: 100, offset: 0 });
      return response.data;
    },
  });

  // Fetch all admins
  const {
    data: adminsData,
    isLoading: isLoadingAdmins,
    error: adminsError,
    refetch: refetchAdmins,
  } = useQuery({
    queryKey: ['allAdmins'],
    queryFn: async () => {
      const response = await api.getAllAdmins({ limit: 100, offset: 0 });
      return response.data;
    },
  });

  // Fetch admin stats
  const {
    data: statsData,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await api.getAdminStats();
      return response.data;
    },
  });

  // Fetch search results for admins
  const {
    data: searchResults,
    isLoading: isLoadingSearch,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['searchAdmins', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const response = await api.searchAdmins(searchQuery, { limit: 50, offset: 0 });
      return response.data;
    },
    enabled: false,
  });

  // Fetch available managers for admin management
  const {
    data: availableManagersData,
    refetch: refetchAvailableManagers,
  } = useQuery({
    queryKey: ['availableManagers'],
    queryFn: async () => {
      const response = await api.getAvailableManagers();
      return response.data;
    },
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

  useEffect(() => {
    if (statsData?.data) {
      setAdminStats(statsData.data);
    }
  }, [statsData]);

  // Create employee role mutation
  const createEmployeeRoleMutation = useMutation({
    mutationFn: (roleData: CreateEmployeeRoleRequest) =>
      api.createEmployeeRole(roleData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      queryClient.invalidateQueries({ queryKey: ['employeeRoles'] });
      setCreateRoleModalVisible(false);
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
      setCreateRoleModalVisible(false);
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

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: UpdateRoleRequest }) =>
      api.updateRole(roleId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      setIsUpdateRoleModalVisible(false);
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

  // Create admin mutation
  const createAdminMutation = useMutation({
    mutationFn: (adminData: CreateAdminRequest) =>
      api.createAdmin(adminData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setCreateAdminModalVisible(false);
      showToast('success', response.data?.message || 'Admin created successfully');
    },
    onError: (error: any) => {
      console.error('Create admin error:', error);
      if (error.response?.status === 409) {
        showToast('error', 'Phone number or username already exists');
      } else if (error.response?.status === 401) {
        showToast('error', 'Session expired. Please login again');
      } else if (error.response?.status === 403) {
        showToast('error', 'You do not have permission to create admins');
      } else {
        showToast('error', error.response?.data?.message || 'Failed to create admin');
      }
    },
  });

  // Update admin mutation
  const updateAdminMutation = useMutation({
    mutationFn: ({ adminId, data }: { adminId: string; data: UpdateAdminRequest }) =>
      api.updateAdmin(adminId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      setIsUpdateAdminModalVisible(false);
      setSelectedAdmin(null);
      showToast('success', response.data?.message || 'Admin updated successfully');
    },
    onError: (error: any) => {
      console.error('Update admin error:', error);
      showToast('error', error.response?.data?.message || 'Failed to update admin');
    },
  });

  // Delete admin mutation
  const deleteAdminMutation = useMutation({
    mutationFn: (adminId: string) => api.deleteAdmin(adminId),
    onSuccess: (response, adminId) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      showToast('success', response.data?.message || 'Admin deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete admin error:', error);
      showToast('error', error.response?.data?.message || 'Failed to delete admin');
    },
  });

  // Activate admin mutation
  const activateAdminMutation = useMutation({
    mutationFn: (adminId: string) => api.activateAdmin(adminId),
    onSuccess: (response, adminId) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      showToast('success', response.data?.message || 'Admin activated successfully');
    },
    onError: (error: any) => {
      console.error('Activate admin error:', error);
      showToast('error', error.response?.data?.message || 'Failed to activate admin');
    },
  });

  // Deactivate admin mutation
  const deactivateAdminMutation = useMutation({
    mutationFn: (adminId: string) => api.deactivateAdmin(adminId),
    onSuccess: (response, adminId) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      showToast('success', response.data?.message || 'Admin deactivated successfully');
    },
    onError: (error: any) => {
      console.error('Deactivate admin error:', error);
      showToast('error', error.response?.data?.message || 'Failed to deactivate admin');
    },
  });

  // Change admin phone mutation
  const changeAdminPhoneMutation = useMutation({
    mutationFn: ({ adminId, newPhone }: { adminId: string; newPhone: string }) =>
      api.changeAdminPhone(adminId, newPhone),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      setIsPhoneModalVisible(false);
      showToast('success', response.data?.message || 'Phone number updated successfully');
    },
    onError: (error: any) => {
      console.error('Change phone error:', error);
      showToast('error', error.response?.data?.message || 'Failed to update phone number');
    },
  });

  // Change admin MPIN mutation
  const changeAdminMPINMutation = useMutation({
    mutationFn: ({ adminId, newMPIN, reason }: { adminId: string; newMPIN: string; reason: string }) =>
      api.changeAdminMPIN(adminId, newMPIN, reason),
    onSuccess: (response, variables) => {
      setIsMPINModalVisible(false);
      showToast('success', response.data?.message || 'MPIN changed successfully');
    },
    onError: (error: any) => {
      console.error('Change MPIN error:', error);
      showToast('error', error.response?.data?.message || 'Failed to change MPIN');
    },
  });

  // Update reports to mutation
  const updateReportsToMutation = useMutation({
    mutationFn: ({ adminId, reportsTo }: { adminId: string; reportsTo: string }) =>
      api.updateAdminReportsTo(adminId, reportsTo),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['availableManagers'] });
      setIsReportsToModalVisible(false);
      showToast('success', response.data?.message || 'Reports to updated successfully');
    },
    onError: (error: any) => {
      console.error('Update reports to error:', error);
      showToast('error', error.response?.data?.message || 'Failed to update reports to');
    },
  });

  // Fetch role details
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

  // Fetch admin details
  const fetchAdminDetails = async (admin: Admin) => {
    setLoadingAdminDetails(true);
    try {
      const response = await api.getAdminWithDetails(admin.admin_id);
      const data = response.data;
      setSelectedAdminDetails(data.data);
      setSelectedAdmin(admin);
      setIsAdminDetailsModalVisible(true);
    } catch (error: any) {
      console.error('Error fetching admin details:', error);
      showToast('error', error.response?.data?.message || 'Failed to load admin details');
    } finally {
      setLoadingAdminDetails(false);
    }
  };

  // Fetch admin phone
  const fetchAdminPhone = async (admin: Admin) => {
    try {
      const response = await api.getAdminPhone(admin.admin_id);
      const data = response.data;
      setSelectedAdminPhone(data.data);
      setSelectedAdmin(admin);
      setIsPhoneModalVisible(true);
    } catch (error: any) {
      console.error('Error fetching admin phone:', error);
      showToast('error', error.response?.data?.message || 'Failed to load phone number');
    }
  };

  // Fetch admin hierarchy
  const fetchAdminHierarchy = async (admin: Admin) => {
    try {
      const response = await api.getAdminHierarchy(admin.admin_id);
      const data = response.data;
      setAdminHierarchy(data.data);
      setSelectedAdmin(admin);
      // Show hierarchy modal (you can create this modal if needed)
      Alert.alert('Hierarchy', 'Hierarchy data loaded. You can create a modal to display this.');
    } catch (error: any) {
      console.error('Error fetching admin hierarchy:', error);
      showToast('error', error.response?.data?.message || 'Failed to load hierarchy');
    }
  };

  // Role Handlers
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
    setIsUpdateRoleModalVisible(true);
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

  // Admin Handlers
  const handleAdminClick = (admin: Admin) => {
    fetchAdminDetails(admin);
  };

  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsUpdateAdminModalVisible(true);
  };

  const handleDeleteAdmin = (admin: Admin) => {
    Alert.alert(
      'Delete Admin',
      `Are you sure you want to delete "${admin.full_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAdminMutation.mutate(admin.admin_id),
        },
      ]
    );
  };

  const handleToggleAdminStatus = (admin: Admin) => {
    if (admin.is_active) {
      Alert.alert(
        'Deactivate Admin',
        `Are you sure you want to deactivate "${admin.full_name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: () => deactivateAdminMutation.mutate(admin.admin_id),
          },
        ]
      );
    } else {
      Alert.alert(
        'Activate Admin',
        `Are you sure you want to activate "${admin.full_name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Activate',
            style: 'default',
            onPress: () => activateAdminMutation.mutate(admin.admin_id),
          },
        ]
      );
    }
  };

  const handleChangePhone = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsPhoneModalVisible(true);
  };

  const handleChangeMPIN = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsMPINModalVisible(true);
  };

  const handleUpdateReportsTo = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsReportsToModalVisible(true);
  };

  const handleCreateAdmin = (adminData: CreateAdminRequest) => {
    if (!adminData.reports_to) {
        adminData.reports_to = adminId ?? undefined;
    }
    createAdminMutation.mutate(adminData);
  };

  const handleUpdateAdmin = (adminId: string, data: UpdateAdminRequest) => {
    updateAdminMutation.mutate({ adminId, data });
  };

  const handleSearch = () => {
    if (searchQuery.trim() && activeTab === 'admins') {
      refetchSearch();
    }
  };

  // Filter functions
  const filterRolesByType = (roles: Role[]) => {
    if (selectedRoleType === 'all') return roles;
    if (selectedRoleType === 'employee') return roles.filter(r => r.role_type === 1);
    if (selectedRoleType === 'manager') return roles.filter(r => r.role_type === 2);
    if (selectedRoleType === 'super_admin') return roles.filter(r => r.role_type === 4);
    return roles;
  };

  const filterAdminsByType = (admins: Admin[]) => {
    if (selectedAdminType === 'all') return admins;
    if (selectedAdminType === 'employee') return admins.filter(a => a.role_type === 1);
    if (selectedAdminType === 'manager') return admins.filter(a => a.role_type === 2);
    if (selectedAdminType === 'super_admin') return admins.filter(a => a.role_type === 4);
    return admins;
  };

  // Data for display
  const rolesToDisplay = filterRolesByType(rolesData?.data?.roles || []);
  const adminsToDisplay = searchQuery.trim() && searchResults?.data?.results
    ? filterAdminsByType(searchResults.data.results)
    : filterAdminsByType(adminsData?.data?.admins || []);

  // Statistics
  const totalRoles = rolesData?.data?.roles?.length || 0;
  const employeeRoles =
  rolesData?.data?.roles?.filter((r: Role) => r.role_type === 1).length || 0;

const managerRoles =
  rolesData?.data?.roles?.filter((r: Role) => r.role_type === 2).length || 0;

const superAdminRoles =
  rolesData?.data?.roles?.filter((r: Role) => r.role_type === 4).length || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'roles') {
        await refetchRoles();
        await refetchDepartments();
      } else {
        await Promise.all([
          refetchAdmins(),
          refetchStats(),
          refetchAvailableManagers(),
        ]);
        if (searchQuery.trim()) {
          await refetchSearch();
        }
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Render functions
  const renderRoleItem = ({ item }: { item: Role }) => (
    <RoleCard
      role={item}
      onView={() => handleRoleClick(item)}
      onEdit={() => handleEditRole(item)}
      onDelete={() => handleDeleteRole(item)}
      loadingRoleDetails={loadingRoleDetails}
      isTablet={isTablet}
      isLargeTablet={isLargeTablet}
    />
  );

  const renderAdminItem = ({ item }: { item: Admin }) => (
    <AdminCard
      admin={item}
      onView={() => handleAdminClick(item)}
      onEdit={() => handleEditAdmin(item)}
      onDelete={() => handleDeleteAdmin(item)}
      onToggleStatus={() => handleToggleAdminStatus(item)}
      onChangePhone={() => handleChangePhone(item)}
      onChangeMPIN={() => handleChangeMPIN(item)}
      onUpdateReportsTo={() => handleUpdateReportsTo(item)}
      loadingAdminDetails={loadingAdminDetails}
      isTablet={isTablet}
      isLargeTablet={isLargeTablet}
    />
  );

  const renderEmptyComponent = () => {
    const isLoading = activeTab === 'roles' ? isLoadingRoles : isLoadingAdmins;
    const error = activeTab === 'roles' ? rolesError : adminsError;
    const emptyText = activeTab === 'roles' ? 'roles' : 'admins';
    const createFunction = activeTab === 'roles' 
      ? () => setCreateRoleModalVisible(true)
      : () => setCreateAdminModalVisible(true);

    if (isLoading) {
      return <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />;
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={isTablet ? 80 : 64} color="#EF4444" />
          <Text style={[styles.errorText, isTablet && styles.errorTextTablet]}>
            Failed to load {emptyText}
          </Text>
          <Text style={[styles.errorSubtext, isTablet && styles.errorSubtextTablet]}>
            {(error as Error).message || 'Please try again'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, isTablet && styles.retryButtonTablet]}
            onPress={onRefresh}
          >
            <MaterialCommunityIcons name="reload" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons 
          name={activeTab === 'roles' ? "shield-account-outline" : "account-group"} 
          size={isTablet ? 100 : 80} 
          color="#CBD5E1" 
        />
        <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
          No {emptyText} found
        </Text>
        <Text style={[styles.emptySubtext, isTablet && styles.emptySubtextTablet]}>
          {searchQuery ? 'Try a different search term' : `Create your first ${activeTab === 'roles' ? 'role' : 'admin'}`}
        </Text>
        {!searchQuery && (
          <TouchableOpacity
            style={[styles.emptyActionButton, isTablet && styles.emptyActionButtonTablet]}
            onPress={createFunction}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionButtonText}>
              Create {activeTab === 'roles' ? 'Role' : 'Admin'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render Stats based on active tab
  const renderStats = () => {
    if (activeTab === 'roles') {
      return (
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
      );
    } else {
      if (!adminStats) return null;
      
      return (
        <>
          <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
            <TouchableOpacity
              style={[styles.statItem, selectedAdminType === 'all' && styles.statItemSelected]}
              onPress={() => setSelectedAdminType('all')}
            >
              <MaterialCommunityIcons name="layers" size={16} color={selectedAdminType === 'all' ? '#8B5CF6' : '#64748B'} />
              <Text style={[styles.statCount, selectedAdminType === 'all' && styles.statCountSelected]}>
                {adminStats.total_admins}
              </Text>
              <Text style={[styles.statLabel, selectedAdminType === 'all' && styles.statLabelSelected]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statItem, selectedAdminType === 'employee' && styles.statItemSelected]}
              onPress={() => setSelectedAdminType('employee')}
            >
              <MaterialCommunityIcons name="account" size={16} color={selectedAdminType === 'employee' ? '#C084FC' : '#64748B'} />
              <Text style={[styles.statCount, selectedAdminType === 'employee' && styles.statCountSelected]}>
                {adminStats.admins_employee}
              </Text>
              <Text style={[styles.statLabel, selectedAdminType === 'employee' && styles.statLabelSelected]}>
                Employee
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statItem, selectedAdminType === 'manager' && styles.statItemSelected]}
              onPress={() => setSelectedAdminType('manager')}
            >
              <MaterialCommunityIcons name="account-tie" size={16} color={selectedAdminType === 'manager' ? '#8B5CF6' : '#64748B'} />
              <Text style={[styles.statCount, selectedAdminType === 'manager' && styles.statCountSelected]}>
                {adminStats.admins_manager}
              </Text>
              <Text style={[styles.statLabel, selectedAdminType === 'manager' && styles.statLabelSelected]}>
                Manager
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statItem, selectedAdminType === 'super_admin' && styles.statItemSelected]}
              onPress={() => setSelectedAdminType('super_admin')}
            >
              <MaterialCommunityIcons name="shield-account" size={16} color={selectedAdminType === 'super_admin' ? '#10B981' : '#64748B'} />
              <Text style={[styles.statCount, selectedAdminType === 'super_admin' && styles.statCountSelected]}>
                {adminStats.admins_super_admin}
              </Text>
              <Text style={[styles.statLabel, selectedAdminType === 'super_admin' && styles.statLabelSelected]}>
                Super Admin
              </Text>
            </TouchableOpacity>
          </View>

          {/* Additional Admin Stats */}
          <View style={[styles.additionalStats, isTablet && styles.additionalStatsTablet]}>
            <View style={styles.additionalStatItem}>
              <MaterialCommunityIcons name="account-check" size={14} color="#10B981" />
              <Text style={styles.additionalStatCount}>{adminStats.active_admins}</Text>
              <Text style={styles.additionalStatLabel}>Active</Text>
            </View>
            <View style={styles.additionalStatItem}>
              <MaterialCommunityIcons name="account-arrow-right" size={14} color="#8B5CF6" />
              <Text style={styles.additionalStatCount}>{adminStats.admins_with_reports_to}</Text>
              <Text style={styles.additionalStatLabel}>Have Manager</Text>
            </View>
            <View style={styles.additionalStatItem}>
              <MaterialCommunityIcons name="account-clock" size={14} color="#F59E0B" />
              <Text style={styles.additionalStatCount}>
                {adminStats.total_admins - adminStats.active_admins}
              </Text>
              <Text style={styles.additionalStatLabel}>Inactive</Text>
            </View>
          </View>
        </>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <View style={isTablet && styles.headerContentTablet}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>
            {activeTab === 'roles' ? 'Company Role Management' : 'Admin Management'}
          </Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            {activeTab === 'roles' 
              ? `Manage all roles and permissions • ${totalRoles} total roles`
              : `Manage all admin users • ${adminStats?.total_admins || 0} total admins`
            }
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'roles' && styles.activeTabButton]}
          onPress={() => setActiveTab('roles')}
        >
          <MaterialCommunityIcons 
            name="shield-account" 
            size={20} 
            color={activeTab === 'roles' ? '#8B5CF6' : '#64748B'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'roles' && styles.activeTabButtonText]}>
            Roles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'admins' && styles.activeTabButton]}
          onPress={() => setActiveTab('admins')}
        >
          <MaterialCommunityIcons 
            name="account-group" 
            size={20} 
            color={activeTab === 'admins' ? '#8B5CF6' : '#64748B'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'admins' && styles.activeTabButtonText]}>
            Admins
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, isTablet && styles.searchContainerTablet]}>
        <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
        <TextInput
          style={[styles.searchInput, isTablet && styles.searchInputTablet]}
          placeholder={
            activeTab === 'roles' 
              ? "Search roles by name or description..." 
              : "Search admins by name, username, or phone..."
          }
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
      {renderStats()}

      {/* List Content */}
      {activeTab === 'roles' ? (
  <FlatList<Role>
    data={rolesToDisplay}
    renderItem={renderRoleItem}
    keyExtractor={(item) => item.admin_role_id}
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
    ListEmptyComponent={renderEmptyComponent()}
    showsVerticalScrollIndicator={false}
  />
) : (
  <FlatList<Admin>
    data={adminsToDisplay}
    renderItem={renderAdminItem}
    keyExtractor={(item) => item.admin_id}
    contentContainerStyle={[
      styles.adminsList,
      isTablet && styles.adminsListTablet,
      adminsToDisplay.length === 0 && styles.emptyListContainer,
    ]}
    numColumns={isLargeTablet ? 3 : (isTablet ? 2 : 1)}
    columnWrapperStyle={(isTablet || isLargeTablet) && styles.adminsGridTablet}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={['#8B5CF6']}
        tintColor="#8B5CF6"
      />
    }
    ListEmptyComponent={renderEmptyComponent()}
    showsVerticalScrollIndicator={false}
  />
)}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, isTablet && styles.fabTablet]}
        onPress={() => {
          if (activeTab === 'roles') {
            setCreateRoleModalVisible(true);
          } else {
            setCreateAdminModalVisible(true);
          }
        }}
      >
        <MaterialCommunityIcons name="plus" size={isTablet ? 28 : 24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Role Modals */}
      <CreateRoleModal
        visible={isCreateRoleModalVisible}
        onClose={() => setCreateRoleModalVisible(false)}
        onSave={handleCreateRole}
        isCreating={createEmployeeRoleMutation.isPending || createManagerRoleMutation.isPending}
        availableDepartments={availableDepartments}
      />

      <UpdateRoleModal
        visible={isUpdateRoleModalVisible}
        onClose={() => {
          setIsUpdateRoleModalVisible(false);
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

      {/* Admin Modals */}
      <CreateAdminModal
        visible={isCreateAdminModalVisible}
        onClose={() => setCreateAdminModalVisible(false)}
        onCreate={handleCreateAdmin}
        isCreating={createAdminMutation.isPending}
        availableManagers={availableManagersData?.data || []}
        currentAdminId={adminId ?? undefined}
      />

      <UpdateAdminModal
        visible={isUpdateAdminModalVisible}
        onClose={() => {
          setIsUpdateAdminModalVisible(false);
          setSelectedAdmin(null);
        }}
        admin={selectedAdmin}
        onUpdate={handleUpdateAdmin}
        isUpdating={updateAdminMutation.isPending}
        availableManagers={availableManagersData?.data || []}
      />

      <AdminDetailsModal
        visible={isAdminDetailsModalVisible}
        onClose={() => {
          setIsAdminDetailsModalVisible(false);
          setSelectedAdminDetails(null);
          setSelectedAdmin(null);
        }}
        adminDetails={selectedAdminDetails}
        isLoading={loadingAdminDetails}
        onEdit={() => selectedAdmin && handleEditAdmin(selectedAdmin)}
        onChangePhone={() => selectedAdmin && handleChangePhone(selectedAdmin)}
        onChangeMPIN={() => selectedAdmin && handleChangeMPIN(selectedAdmin)}
        onUpdateReportsTo={() => selectedAdmin && handleUpdateReportsTo(selectedAdmin)}
        onToggleStatus={() => selectedAdmin && handleToggleAdminStatus(selectedAdmin)}
        onViewHierarchy={() => selectedAdmin && fetchAdminHierarchy(selectedAdmin)}
      />

      <PhoneChangeModal
        visible={isPhoneModalVisible}
        onClose={() => {
          setIsPhoneModalVisible(false);
          setSelectedAdmin(null);
          setSelectedAdminPhone(null);
        }}
        admin={selectedAdmin}
        currentPhone={selectedAdminPhone?.phone_number}
        onChange={changeAdminPhoneMutation.mutate}
        isChanging={changeAdminPhoneMutation.isPending}
      />

      <MPINChangeModal
        visible={isMPINModalVisible}
        onClose={() => {
          setIsMPINModalVisible(false);
          setSelectedAdmin(null);
        }}
        admin={selectedAdmin}
        onChange={changeAdminMPINMutation.mutate}
        isChanging={changeAdminMPINMutation.isPending}
      />

      <ReportsToModal
        visible={isReportsToModalVisible}
        onClose={() => {
          setIsReportsToModalVisible(false);
          setSelectedAdmin(null);
        }}
        admin={selectedAdmin}
        availableManagers={availableManagersData?.data || []}
        onUpdate={updateReportsToMutation.mutate}
        isUpdating={updateReportsToMutation.isPending}
      />
    </SafeAreaView>
  );
};

export default CompanyManagementScreen;