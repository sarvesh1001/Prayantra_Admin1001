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
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Admin, Role } from '@/types';
import { useToast } from '@/components/Toast';
import { api } from '@/services/api';
import styles from '../styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface UpdateAdminModalProps {
  visible: boolean;
  onClose: () => void;
  admin: Admin | null;
  onUpdate: (adminId: string, data: any) => void;
  isUpdating: boolean;
  availableManagers: Admin[];
  onUpdateRole: (adminId: string, newRoleId: string) => void;
  isUpdatingRole: boolean;
}

const UpdateAdminModal: React.FC<UpdateAdminModalProps> = ({
  visible,
  onClose,
  admin,
  onUpdate,
  isUpdating,
  availableManagers,
  onUpdateRole,
  isUpdatingRole,
}) => {
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [reportsTo, setReportsTo] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingAdminDetails, setLoadingAdminDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (visible && admin) {
      loadAdminDetails();
      loadAvailableRoles();
    }
  }, [visible, admin]);

  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = availableRoles.filter(role =>
        role.role_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRoles(filtered);
    } else {
      setFilteredRoles(availableRoles);
    }
  }, [searchQuery, availableRoles]);

  const resetForm = () => {
    setUsername('');
    setFullName('');
    setSelectedRole(null);
    setReportsTo('');
    setSearchQuery('');
  };

  const loadAdminDetails = async () => {
    if (!admin) return;

    setLoadingAdminDetails(true);
    try {
      const response = await api.getAdminWithDetails(admin.admin_id);
      const adminDetails = response.data.data;
      
      setUsername(admin.username);
      setFullName(admin.full_name);
      setReportsTo(admin.reports_to || '');

      // Load role details
      const roleResponse = await api.getAllRoles({ limit: 100, offset: 0 });
      const roles: Role[] = roleResponse.data?.data?.roles ?? [];
      
      const adminRole = roles.find(
        (r: Role) => r.admin_role_id === admin.admin_role_id
      );
      
      if (adminRole) {
        setSelectedRole(adminRole);
      }
    } catch (error) {
      console.error('Error loading admin details:', error);
      showToast('error', 'Failed to load admin details');
    } finally {
      setLoadingAdminDetails(false);
    }
  };

  const loadAvailableRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await api.getAllRoles({ limit: 100, offset: 0 });
      const roles = response.data?.data?.roles || [];
      setAvailableRoles(roles);
      setFilteredRoles(roles);
    } catch (error) {
      console.error('Error loading roles:', error);
      showToast('error', 'Failed to load available roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSubmit = async () => {
    if (!admin || !username.trim() || !fullName.trim()) {
      Alert.alert('Error', 'Username and full name are required');
      return;
    }

    try {
      // Update role separately if changed (using correct API)
      if (selectedRole && selectedRole.admin_role_id !== admin.admin_role_id) {
        await onUpdateRole(admin.admin_id, selectedRole.admin_role_id);
      }

      // Prepare profile update data (without role info)
      const updateData: any = {
        username: username.trim(),
        full_name: fullName.trim(),
      };

      if (reportsTo !== admin.reports_to) {
        updateData.reports_to = reportsTo || null;
      }

      // Only update profile if there are changes
      const hasProfileChanges = 
        username !== admin.username || 
        fullName !== admin.full_name || 
        reportsTo !== admin.reports_to;
      
      if (hasProfileChanges) {
        await onUpdate(admin.admin_id, updateData);
      }

      // Show success message
      showToast('success', 'Admin updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Update admin error:', error);
      showToast('error', error.response?.data?.message || 'Failed to update admin');
    }
  };

  if (!admin) return null;

  const isSubmitting = isUpdating || isUpdatingRole;

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
                Update Admin: {admin.full_name}
              </Text>
              <Text style={[styles.updateModalSubtitle, isTablet && styles.updateModalSubtitleTablet]}>
                @{admin.username} • {admin.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting || loadingAdminDetails}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            style={styles.updateModalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={loadingAdminDetails}
                onRefresh={loadAdminDetails}
                colors={['#8B5CF6']}
                tintColor="#8B5CF6"
              />
            }
          >
            {loadingAdminDetails ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingRoleText}>Loading admin details...</Text>
              </View>
            ) : (
              <>
                {/* Basic Info */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                      Username
                    </Text>
                    <Text style={styles.requiredStar}>*</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, isTablet && styles.textInputTablet]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                      Full Name
                    </Text>
                    <Text style={styles.requiredStar}>*</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, isTablet && styles.textInputTablet]}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter full name"
                    placeholderTextColor="#94A3B8"
                    editable={!isSubmitting}
                  />
                </View>

                {/* Role Selection */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                    Admin Role
                  </Text>
                  <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                    Current: {admin.role_name}
                  </Text>
                  
                  {/* Search Roles */}
                  <View style={[styles.searchContainer, styles.roleSearch]}>
                    <MaterialCommunityIcons name="magnify" size={16} color="#64748B" />
                    <TextInput
                      style={[styles.searchInput, styles.roleSearchInput]}
                      placeholder="Search roles..."
                      placeholderTextColor="#94A3B8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      editable={!isSubmitting}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Role List */}
                  {loadingRoles ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#8B5CF6" />
                      <Text style={styles.loadingRoleText}>Loading roles...</Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.roleList} nestedScrollEnabled>
                      {filteredRoles.map((role) => (
                        <TouchableOpacity
                          key={role.admin_role_id}
                          style={[
                            styles.roleOption,
                            selectedRole?.admin_role_id === role.admin_role_id && styles.roleOptionSelected,
                            admin.admin_role_id === role.admin_role_id && styles.currentRoleOption,
                          ]}
                          onPress={() => setSelectedRole(role)}
                          disabled={isSubmitting}
                        >
                          <View style={styles.roleOptionContent}>
                            <View style={styles.roleOptionHeader}>
                              <MaterialCommunityIcons
                                name={
                                  role.role_type === 1 ? "account" :
                                  role.role_type === 2 ? "account-tie" :
                                  "shield-account"
                                }
                                size={20}
                                color={
                                  role.role_type === 1 ? "#C084FC" :
                                  role.role_type === 2 ? "#8B5CF6" :
                                  "#10B981"
                                }
                              />
                              <Text style={[styles.roleName, isTablet && styles.roleNameTablet]}>
                                {role.role_name}
                              </Text>
                              {admin.admin_role_id === role.admin_role_id && (
                                <View style={styles.currentBadge}>
                                  <Text style={styles.currentBadgeText}>Current</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.roleDescriptionSmall} numberOfLines={2}>
                              {role.description || 'No description'}
                            </Text>
                            <View style={styles.roleMetaSmall}>
                              <Text style={styles.roleMetaText}>
                                {role.role_type === 1 ? 'Employee' :
                                 role.role_type === 2 ? 'Manager' :
                                 'Super Admin'}
                              </Text>
                              <Text style={styles.roleMetaText}>
                                • Level {role.role_level}
                              </Text>
                            </View>
                          </View>
                          <MaterialCommunityIcons
                            name={selectedRole?.admin_role_id === role.admin_role_id ? "check-circle" : "circle-outline"}
                            size={20}
                            color={selectedRole?.admin_role_id === role.admin_role_id ? '#8B5CF6' : '#CBD5E1'}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Reports To */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                    Reports To
                  </Text>
                  <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                    Select manager for this admin
                  </Text>
                  
                  <View style={styles.reportsToSelector}>
                    <TouchableOpacity
                      style={[
                        styles.reportsToOption,
                        !reportsTo && styles.reportsToOptionSelected,
                      ]}
                      onPress={() => setReportsTo('')}
                      disabled={isSubmitting}
                    >
                      <MaterialCommunityIcons
                        name="account"
                        size={16}
                        color={!reportsTo ? '#8B5CF6' : '#64748B'}
                      />
                      <Text style={[
                        styles.reportsToText,
                        !reportsTo && styles.reportsToTextSelected,
                      ]}>
                        No Manager
                      </Text>
                    </TouchableOpacity>
                    
                    {availableManagers
                      .filter(manager => manager.admin_id !== admin.admin_id)
                      .map((manager) => (
                        <TouchableOpacity
                          key={manager.admin_id}
                          style={[
                            styles.reportsToOption,
                            reportsTo === manager.admin_id && styles.reportsToOptionSelected,
                          ]}
                          onPress={() => setReportsTo(manager.admin_id)}
                          disabled={isSubmitting}
                        >
                          <MaterialCommunityIcons
                            name="account-tie"
                            size={16}
                            color={reportsTo === manager.admin_id ? '#8B5CF6' : '#64748B'}
                          />
                          <View style={styles.reportsToInfo}>
                            <Text style={[
                              styles.reportsToText,
                              reportsTo === manager.admin_id && styles.reportsToTextSelected,
                            ]}>
                              {manager.full_name}
                            </Text>
                            <Text style={styles.reportsToUsername}>
                              @{manager.username} • {manager.role_name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>

                {/* Summary */}
                <View style={styles.summaryCard}>
                  <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#8B5CF6" />
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryTitle}>Update Summary</Text>
                    <View style={styles.summaryDetails}>
                      <Text style={styles.summaryText}>
                        • Username: {username || 'Not set'}
                      </Text>
                      <Text style={styles.summaryText}>
                        • Full Name: {fullName || 'Not set'}
                      </Text>
                      <Text style={styles.summaryText}>
                        • New Role: {selectedRole?.role_name || 'No change'}
                      </Text>
                      <Text style={styles.summaryText}>
                        • Reports To: {reportsTo ? 
                          availableManagers.find(m => m.admin_id === reportsTo)?.full_name || 'Manager' : 
                          'No Manager'}
                      </Text>
                      <Text style={styles.summaryText}>
                        • Changes: {
                          (username !== admin.username ||
                          fullName !== admin.full_name ||
                          (selectedRole && selectedRole.admin_role_id !== admin.admin_role_id) ||
                          reportsTo !== admin.reports_to)
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
                disabled={isSubmitting}
              >
                <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isTablet && styles.submitButtonTablet,
                  isSubmitting && styles.submitButtonDisabled,
                  (!username.trim() || !fullName.trim()) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || !username.trim() || !fullName.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={isTablet ? 20 : 16} color="#FFFFFF" />
                    <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                      Update Admin
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

export default UpdateAdminModal;