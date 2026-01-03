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
  Admin,
  AdminDetails,
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminStats,
  AdminHierarchy,
  AdminPhoneInfo,
} from '@/types';

// Components
import CreateAdminModal from './CreateAdminModal';
import UpdateAdminModal from './UpdateAdminModal';
import AdminDetailsModal from './AdminDetailsModal';
import AdminCard from './AdminCard';
import PhoneChangeModal from './PhoneChangeModal';
import MPINChangeModal from './MPINChangeModal';
import ReportsToModal from './ReportsToModal';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

const AdminManagementScreen = () => {
  const { adminId } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminType, setSelectedAdminType] = useState<'all' | 'employee' | 'manager' | 'super_admin'>('all');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isAdminDetailsModalVisible, setIsAdminDetailsModalVisible] = useState(false);
  const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);
  const [isMPINModalVisible, setIsMPINModalVisible] = useState(false);
  const [isReportsToModalVisible, setIsReportsToModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [selectedAdminDetails, setSelectedAdminDetails] = useState<AdminDetails | null>(null);
  const [selectedAdminPhone, setSelectedAdminPhone] = useState<AdminPhoneInfo | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminHierarchy, setAdminHierarchy] = useState<AdminHierarchy[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAdminDetails, setLoadingAdminDetails] = useState(false);

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

  // Fetch search results
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

  // Fetch available managers
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

  useEffect(() => {
    if (statsData?.data) {
      setAdminStats(statsData.data);
    }
  }, [statsData]);

  // Create admin mutation
  const createAdminMutation = useMutation({
    mutationFn: (adminData: CreateAdminRequest) =>
      api.createAdmin(adminData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setCreateModalVisible(false);
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

  // Update admin profile mutation (does NOT include role update)
  const updateAdminProfileMutation = useMutation({
    mutationFn: ({ adminId, data }: { adminId: string; data: UpdateAdminRequest }) =>
      api.updateAdmin(adminId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      showToast('success', response.data?.message || 'Admin profile updated successfully');
    },
    onError: (error: any) => {
      console.error('Update admin profile error:', error);
      showToast('error', error.response?.data?.message || 'Failed to update admin profile');
    },
  });

  // Update admin role mutation (uses separate API)
  const updateAdminRoleMutation = useMutation({
    mutationFn: ({ adminId, newRoleId }: { adminId: string; newRoleId: string }) =>
      api.updateAdminRole(adminId, newRoleId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allAdmins'] });
      showToast('success', response.data?.message || 'Admin role updated successfully');
    },
    onError: (error: any) => {
      console.error('Update admin role error:', error);
      showToast('error', error.response?.data?.message || 'Failed to update admin role');
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
      // Show hierarchy modal (you'll need to create this)
    } catch (error: any) {
      console.error('Error fetching admin hierarchy:', error);
      showToast('error', error.response?.data?.message || 'Failed to load hierarchy');
    }
  };

  const handleAdminClick = (admin: Admin) => {
    fetchAdminDetails(admin);
  };

  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsUpdateModalVisible(true);
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

  const handleUpdateAdminProfile = (adminId: string, data: UpdateAdminRequest) => {
    updateAdminProfileMutation.mutate({ adminId, data });
  };

  const handleUpdateAdminRole = async (adminId: string, newRoleId: string) => {
    return updateAdminRoleMutation.mutateAsync({ adminId, newRoleId });
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      refetchSearch();
    }
  };

  const filterAdminsByType = (admins: Admin[]) => {
    if (selectedAdminType === 'all') return admins;
    if (selectedAdminType === 'employee') return admins.filter(a => a.role_type === 1);
    if (selectedAdminType === 'manager') return admins.filter(a => a.role_type === 2);
    if (selectedAdminType === 'super_admin') return admins.filter(a => a.role_type === 4);
    return admins;
  };

  const adminsToDisplay =
  searchQuery.trim() && searchResults?.data?.results
    ? filterAdminsByType(searchResults.data.results)
    : filterAdminsByType(adminsData?.data?.admins || []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAdmins(),
        refetchStats(),
        refetchAvailableManagers(),
      ]);
      if (searchQuery.trim()) {
        await refetchSearch();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Render functions
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
    if (isLoadingAdmins) {
      return <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />;
    }

    if (adminsError) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={isTablet ? 80 : 64} color="#EF4444" />
          <Text style={[styles.errorText, isTablet && styles.errorTextTablet]}>
            Failed to load admins
          </Text>
          <Text style={[styles.errorSubtext, isTablet && styles.errorSubtextTablet]}>
            {(adminsError as Error).message || 'Please try again'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, isTablet && styles.retryButtonTablet]}
            onPress={() => refetchAdmins()}
          >
            <MaterialCommunityIcons name="reload" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="account-group" size={isTablet ? 100 : 80} color="#CBD5E1" />
        <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
          No admins found
        </Text>
        <Text style={[styles.emptySubtext, isTablet && styles.emptySubtextTablet]}>
          {searchQuery ? 'Try a different search term' : 'Create your first admin'}
        </Text>
        {!searchQuery && (
          <TouchableOpacity
            style={[styles.emptyActionButton, isTablet && styles.emptyActionButtonTablet]}
            onPress={() => setCreateModalVisible(true)}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionButtonText}>Create Admin</Text>
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
          <Text style={[styles.title, isTablet && styles.titleTablet]}>Admin Management</Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            Manage all admin users • {adminStats?.total_admins || 0} total admins
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, isTablet && styles.searchContainerTablet]}>
        <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
        <TextInput
          style={[styles.searchInput, isTablet && styles.searchInputTablet]}
          placeholder="Search admins by name, username, or phone..."
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
      {adminStats && (
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
      )}

      {/* Additional Stats */}
      {adminStats && (
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
      )}

      {/* Admins List */}
      <FlatList
        data={adminsToDisplay}
        renderItem={renderAdminItem}
        keyExtractor={(item: Admin) => item.admin_id}
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, isTablet && styles.fabTablet]}
        onPress={() => setCreateModalVisible(true)}
      >
        <MaterialCommunityIcons name="plus" size={isTablet ? 28 : 24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modals */}
      <CreateAdminModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreateAdmin}
        isCreating={createAdminMutation.isPending}
        availableManagers={availableManagersData?.data || []}
        currentAdminId={adminId ?? undefined}
        />

      <UpdateAdminModal
        visible={isUpdateModalVisible}
        onClose={() => {
          setIsUpdateModalVisible(false);
          setSelectedAdmin(null);
        }}
        admin={selectedAdmin}
        onUpdate={handleUpdateAdminProfile}
        isUpdating={updateAdminProfileMutation.isPending}
        availableManagers={availableManagersData?.data || []}
        onUpdateRole={handleUpdateAdminRole}
        isUpdatingRole={updateAdminRoleMutation.isPending}
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

// Styles (add to your existing styles or create new ones)
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
    marginBottom: 8,
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
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  additionalStats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  additionalStatsTablet: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  additionalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  additionalStatCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  additionalStatLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
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
  adminsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  adminsListTablet: {
    paddingHorizontal: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  adminsGridTablet: {
    justifyContent: 'space-between',
    gap: 16,
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
});

export default AdminManagementScreen;