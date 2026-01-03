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
} from '@/types';

// Components
import CreateRoleModal from './components/CreateRoleModal';
import UpdateRoleModal from './components/UpdateRoleModal';
import RoleDetailsModal from './components/RoleDetailsModal';
import RoleCard from './components/RoleCard';

// Styles
import styles from './styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

// Interfaces
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

  // Update role mutation
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

  const renderEmptyComponent = () => {
    if (isLoadingRoles) {
      return <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />;
    }

    if (rolesError) {
      return (
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
      );
    }

    return (
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
    );
  };

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
        ListEmptyComponent={renderEmptyComponent()}
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

export default CompanyManagementScreen;