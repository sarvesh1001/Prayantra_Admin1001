import React, { useState, useEffect } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { api } from '@/services/api';
import { Role } from '@/types/role';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isSmallScreen = width < 375;

const ManagerManagementScreen = () => {
  const { adminInfo, adminId } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch manager roles
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ['managerRoles'],
    queryFn: () => api.getManagerRoles(),
  });

  // Filter roles based on search query
  const filteredRoles = React.useMemo(() => {
    if (!searchQuery.trim() || !rolesData?.data?.roles) {
      return rolesData?.data?.roles || [];
    }
  
    const query = searchQuery.toLowerCase();
  
    return rolesData.data.roles.filter((role: Role) =>
      role.role_name.toLowerCase().includes(query) ||
      (role.description && role.description.toLowerCase().includes(query))
    );
  }, [rolesData, searchQuery]);
  
  // Filter departments to only show Manager Management department
  const filteredDepartments = React.useMemo(() => {
    const allDepartments = adminInfo?.departments || [];
    
    // Only show departments that have "manager_management" in the name or module_code
    return allDepartments.filter(dept => 
      dept.includes('Manager Management') || 
      dept.toLowerCase().includes('manager_management')
    );
  }, [adminInfo]);

  // Pre-select Manager Management department if available
  useEffect(() => {
    if (filteredDepartments.length > 0 && selectedDepartments.length === 0) {
      setSelectedDepartments(filteredDepartments);
    }
  }, [filteredDepartments]);

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (roleData: any) => api.createManagerRole(roleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerRoles'] });
      setCreateModalVisible(false);
      resetForm();
      showToast('success', 'Manager role created successfully');
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        showToast('error', 'Role name already exists');
      } else {
        showToast('error', error.response?.data?.message || 'Failed to create role');
      }
    },
  });

  const resetForm = () => {
    setRoleName('');
    setDescription('');
    setSelectedDepartments(filteredDepartments); // Reset to default
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchRoles();
    setRefreshing(false);
  };

  const handleCreateRole = () => {
    if (!roleName.trim()) {
      showToast('error', 'Role name is required');
      return;
    }

    if (selectedDepartments.length === 0) {
      showToast('error', 'Manager Management department must be selected');
      return;
    }

    // Validate department selection (should only be Manager Management)
    const invalidDepartments = selectedDepartments.filter(dept => 
      !dept.includes('Manager Management')
    );
    
    if (invalidDepartments.length > 0) {
      showToast('error', 'Manager roles can only be assigned to Manager Management department');
      return;
    }

    const roleData = {
      role_name: roleName.trim(),
      description: description.trim(),
      department_names: selectedDepartments,
    };

    createRoleMutation.mutate(roleData);
  };

  const toggleDepartmentSelection = (departmentName: string) => {
    // For Manager Management, we can only select/deselect Manager Management
    if (departmentName.includes('Manager Management')) {
      setSelectedDepartments(prev => {
        if (prev.includes(departmentName)) {
          // Don't allow deselection of Manager Management if it's the only one
          if (filteredDepartments.length === 1) {
            showToast('info', 'Manager Management department is required');
            return prev;
          }
          return prev.filter(d => d !== departmentName);
        } else {
          return [...prev, departmentName];
        }
      });
    } else {
      // Show error if trying to select non-manager-management department
      showToast('error', 'Manager roles can only be assigned to Manager Management department');
    }
  };

  const renderRoleCard = ({ item }: { item: Role }) => (
    <TouchableOpacity
      style={[styles.roleCard, isTablet && styles.roleCardTablet]}
      onPress={() => {
        // Navigate to role details or show actions
        showToast('info', `${item.role_name} selected`);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.roleHeader}>
        <View style={[styles.roleIconContainer, styles.managerIcon]}>
          <MaterialCommunityIcons 
            name="account-tie" 
            size={isTablet ? 28 : 24} 
            color="#8B5CF6" 
          />
        </View>
        <View style={styles.roleInfo}>
          <Text style={[styles.roleName, isTablet && styles.roleNameTablet]}>
            {item.role_name}
          </Text>
          <Text style={styles.roleDescription} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>
        </View>
        <View style={[styles.roleBadge, styles.managerBadge]}>
          <Text style={styles.roleBadgeText}>
            Level {item.role_level}
          </Text>
        </View>
      </View>
      
      <View style={styles.roleFooter}>
        <View style={styles.roleTypeContainer}>
          <MaterialCommunityIcons 
            name="shield-account" 
            size={isTablet ? 16 : 14} 
            color="#8B5CF6" 
          />
          <Text style={styles.roleType}>
            {item.role_type === 2 ? 'Manager Role' : 'Unknown'}
          </Text>
        </View>
        <Text style={styles.roleDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDepartmentItem = ({ item }: { item: string }) => {
    const isManagerManagement = item.includes('Manager Management');
    const isSelected = selectedDepartments.includes(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.departmentItem,
          isSelected && styles.departmentItemSelected,
          isTablet && styles.departmentItemTablet,
          !isManagerManagement && styles.departmentItemDisabled,
        ]}
        onPress={() => toggleDepartmentSelection(item)}
        disabled={!isManagerManagement}
        activeOpacity={isManagerManagement ? 0.7 : 1}
      >
        <MaterialCommunityIcons
          name={isManagerManagement ? "shield-account" : "office-building"}
          size={isTablet ? 24 : 20}
          color={isSelected ? '#8B5CF6' : (isManagerManagement ? '#64748B' : '#CBD5E1')}
        />
        <View style={styles.departmentTextContainer}>
          <Text
            style={[
              styles.departmentName,
              isSelected && styles.departmentNameSelected,
              isTablet && styles.departmentNameTablet,
              !isManagerManagement && styles.departmentNameDisabled,
            ]}
            numberOfLines={1}
          >
            {item}
          </Text>
          {isManagerManagement && (
            <Text style={styles.departmentSubtext}>
              Manager oversight and coordination
            </Text>
          )}
        </View>
        {isSelected && (
          <MaterialCommunityIcons
            name="check-circle"
            size={isTablet ? 24 : 20}
            color="#8B5CF6"
          />
        )}
        {!isManagerManagement && (
          <MaterialCommunityIcons
            name="lock"
            size={isTablet ? 16 : 14}
            color="#CBD5E1"
            style={styles.lockIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons 
              name="shield-account" 
              size={isTablet ? 32 : 24} 
              color="#8B5CF6" 
            />
            <Text style={[styles.title, isTablet && styles.titleTablet]}>
              Manager Roles
            </Text>
          </View>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            Create and manage manager roles with Manager Management permissions
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.createButton, isTablet && styles.createButtonTablet]}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="plus" 
            size={isTablet ? 24 : 20} 
            color="#FFFFFF" 
          />
          <Text style={[styles.createButtonText, isTablet && styles.createButtonTextTablet]}>
            New Role
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, isTablet && styles.searchContainerTablet]}>
        <MaterialCommunityIcons 
          name="magnify" 
          size={isTablet ? 24 : 20} 
          color="#64748B" 
        />
        <TextInput
          style={[styles.searchInput, isTablet && styles.searchInputTablet]}
          placeholder="Search manager roles..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94A3B8"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons 
              name="close-circle" 
              size={isTablet ? 20 : 16} 
              color="#94A3B8" 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, isTablet && styles.statValueTablet]}>
            {filteredRoles.length}
          </Text>
          <Text style={[styles.statLabel, isTablet && styles.statLabelTablet]}>
            Total Roles
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, isTablet && styles.statValueTablet]}>
            {filteredDepartments.length}
          </Text>
          <Text style={[styles.statLabel, isTablet && styles.statLabelTablet]}>
            Departments
          </Text>
        </View>
      </View>

      {/* Roles List */}
      <FlatList
        data={filteredRoles}
        renderItem={renderRoleCard}
        keyExtractor={(item) => item.admin_role_id}
        contentContainerStyle={[
          styles.content,
          filteredRoles.length === 0 && styles.emptyContent,
        ]}
        showsVerticalScrollIndicator={false}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet && styles.rolesGridTablet}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoadingRoles ? (
              <ActivityIndicator size="large" color="#8B5CF6" />
            ) : rolesError ? (
              <>
                <MaterialCommunityIcons 
                  name="alert-circle" 
                  size={isTablet ? 64 : 48} 
                  color="#EF4444" 
                />
                <Text style={[styles.errorText, isTablet && styles.errorTextTablet]}>
                  Failed to load manager roles
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => refetchRoles()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <MaterialCommunityIcons 
                  name="shield-account-outline" 
                  size={isTablet ? 80 : 64} 
                  color="#CBD5E1" 
                />
                <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
                  No manager roles found
                </Text>
                <Text style={[styles.emptySubtext, isTablet && styles.emptySubtextTablet]}>
                  {searchQuery ? 'Try a different search term' : 'Create your first manager role'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={[styles.createEmptyButton, isTablet && styles.createEmptyButtonTablet]}
                    onPress={() => setCreateModalVisible(true)}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                    <Text style={styles.createEmptyButtonText}>Create Manager Role</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        }
      />

      {/* Create Role Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <MaterialCommunityIcons 
                  name="shield-account" 
                  size={isTablet ? 28 : 24} 
                  color="#8B5CF6" 
                />
                <Text style={[styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                  Create Manager Role
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setCreateModalVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={isTablet ? 28 : 24} 
                  color="#64748B" 
                />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalNote}>
                <MaterialCommunityIcons 
                  name="information" 
                  size={isTablet ? 20 : 16} 
                  color="#8B5CF6" 
                />
                <Text style={[styles.modalNoteText, isTablet && styles.modalNoteTextTablet]}>
                  Manager roles automatically get ALL Manager Management permissions
                </Text>
              </View>

              {/* Role Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Role Name *
                </Text>
                <TextInput
                  style={[styles.textInput, isTablet && styles.textInputTablet]}
                  value={roleName}
                  onChangeText={setRoleName}
                  placeholder="e.g., Senior Manager"
                  placeholderTextColor="#94A3B8"
                  maxLength={50}
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
                  placeholder="Describe the manager role..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={isTablet ? 4 : 3}
                  maxLength={200}
                />
                <Text style={styles.charCount}>
                  {description.length}/200
                </Text>
              </View>

              {/* Department Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Assigned Department *
                </Text>
                <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                  Manager roles can only be assigned to Manager Management department
                </Text>
                
                <View style={styles.departmentList}>
                  {filteredDepartments.map((dept, index) => (
                    <View key={index} style={styles.departmentItemWrapper}>
                      {renderDepartmentItem({ item: dept })}
                    </View>
                  ))}
                  
                  {filteredDepartments.length === 0 && (
                    <View style={styles.noDepartmentContainer}>
                      <MaterialCommunityIcons 
                        name="alert" 
                        size={isTablet ? 32 : 24} 
                        color="#F59E0B" 
                      />
                      <Text style={styles.noDepartmentText}>
                        You don't have access to Manager Management department
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
                onPress={() => setCreateModalVisible(false)}
                activeOpacity={0.7}
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
                  (createRoleMutation.isPending || selectedDepartments.length === 0) && styles.submitButtonDisabled,
                ]}
                onPress={handleCreateRole}
                disabled={createRoleMutation.isPending || selectedDepartments.length === 0}
                activeOpacity={0.8}
              >
                {createRoleMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name="shield-check" 
                      size={isTablet ? 24 : 20} 
                      color="#FFFFFF" 
                    />
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
  headerContent: {
    flex: 1,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  titleTablet: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  subtitleTablet: {
    fontSize: 16,
    lineHeight: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'flex-start',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createButtonTextTablet: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchContainerTablet: {
    margin: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'System',
  },
  searchInputTablet: {
    marginLeft: 16,
    fontSize: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsContainerTablet: {
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  statValueTablet: {
    fontSize: 28,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  statLabelTablet: {
    fontSize: 14,
    marginTop: 6,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardTablet: {
    flex: 1,
    margin: 8,
    marginBottom: 16,
    padding: 20,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  managerIcon: {
    backgroundColor: '#F5F3FF',
  },
  roleInfo: {
    flex: 1,
    marginRight: 8,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  roleNameTablet: {
    fontSize: 20,
    marginBottom: 6,
  },
  roleDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  managerBadge: {
    backgroundColor: '#F5F3FF',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
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
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  roleDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  rolesGridTablet: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    textAlign: 'center',
  },
  errorTextTablet: {
    fontSize: 18,
    marginTop: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptyTextTablet: {
    fontSize: 20,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtextTablet: {
    fontSize: 16,
    marginTop: 10,
  },
  createEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 24,
  },
  createEmptyButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createEmptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    maxHeight: height * 0.9,
  },
  modalContentTablet: {
    maxHeight: height * 0.9,
    marginHorizontal: 'auto',
    width: isTablet ? '70%' : '100%',
    borderRadius: 20,
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
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalTitleTablet: {
    fontSize: 24,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3FF',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
    gap: 12,
  },
  modalNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    lineHeight: 20,
  },
  modalNoteTextTablet: {
    fontSize: 16,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputLabelTablet: {
    fontSize: 18,
    marginBottom: 10,
  },
  inputSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputSubtextTablet: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'System',
  },
  textInputTablet: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    borderRadius: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  textAreaTablet: {
    minHeight: 120,
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  departmentList: {
    marginTop: 8,
  },
  departmentItemWrapper: {
    marginBottom: 8,
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
  },
  departmentItemTablet: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 12,
  },
  departmentItemSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
  departmentItemDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  departmentTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  departmentName: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  departmentNameTablet: {
    fontSize: 18,
  },
  departmentNameSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  departmentNameDisabled: {
    color: '#CBD5E1',
  },
  departmentSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  lockIcon: {
    marginLeft: 8,
  },
  noDepartmentContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  noDepartmentText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 16,
  },
  cancelButtonTablet: {
    borderRadius: 12,
    paddingVertical: 18,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  cancelButtonTextTablet: {
    fontSize: 18,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 16,
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonTablet: {
    borderRadius: 12,
    paddingVertical: 18,
    gap: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButtonTextTablet: {
    fontSize: 18,
  },
});

export default ManagerManagementScreen;