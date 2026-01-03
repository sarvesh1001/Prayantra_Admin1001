// components/CreateAdminModal.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Admin, Role } from '@/types';
import { useToast } from '@/components/Toast';
import { api } from '@/services/api';
import styles from '../styles';
import { CreateAdminRequest } from '@/types';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface CreateAdminModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: CreateAdminRequest) => void;
  isCreating: boolean;
  availableManagers: Admin[];
  currentAdminId?: string;
}

const CreateAdminModal: React.FC<CreateAdminModalProps> = ({
  visible,
  onClose,
  onCreate,
  isCreating,
  availableManagers,
  currentAdminId,
}) => {
  const { showToast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [reportsTo, setReportsTo] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (visible) {
      loadAvailableRoles();
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

  const loadAvailableRoles = async () => {
    setLoadingRoles(true);
    try {
        const response = await api.getAllRoles({ limit: 100, offset: 0 });
        const roles: Role[] = response.data?.data?.roles ?? [];
      setAvailableRoles(roles);
      setFilteredRoles(roles);
    } catch (error) {
      console.error('Error loading roles:', error);
      showToast('error', 'Failed to load available roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  const resetForm = () => {
    setPhoneNumber('');
    setUsername('');
    setFullName('');
    setSelectedRole(null);
    setReportsTo('');
    setSearchQuery('');
  };

  const handleClose = () => {
    if (!isCreating) {
      resetForm();
      onClose();
    }
  };

  const handleCreate = () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    const adminData = {
      phone_number: phoneNumber.trim(),
      username: username.trim(),
      full_name: fullName.trim(),
      admin_role_id: selectedRole.admin_role_id,
      reports_to: reportsTo || currentAdminId || undefined,
    };

    onCreate(adminData);
  };

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text.replace(/\s+/g, ''));
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
                Create New Admin
              </Text>
              <Text style={[styles.createModalSubtitle, isTablet && styles.createModalSubtitleTablet]}>
                Add a new admin user to the system
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
            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Phone Number
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, isTablet && styles.textInputTablet]}
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                placeholder="+919876543210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                editable={!isCreating}
              />
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Format: +1 (XXX) XXX-XXXX
              </Text>
            </View>

            {/* Username */}
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
                placeholder="john.doe"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                editable={!isCreating}
              />
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Unique identifier for the admin
              </Text>
            </View>

            {/* Full Name */}
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
                placeholder="John Doe"
                placeholderTextColor="#94A3B8"
                editable={!isCreating}
              />
            </View>

            {/* Role Selection */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Admin Role
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Select the role for this admin user
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
                      ]}
                      onPress={() => setSelectedRole(role)}
                      disabled={isCreating}
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
                          {role.is_system_role && (
                            <View style={styles.systemBadgeSmall}>
                              <Text style={styles.systemBadgeTextSmall}>System</Text>
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

            {/* Reports To (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                Reports To (Optional)
              </Text>
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Select manager for this admin (defaults to you)
              </Text>
              
              <View style={styles.reportsToSelector}>
                <TouchableOpacity
                  style={[
                    styles.reportsToOption,
                    !reportsTo && styles.reportsToOptionSelected,
                  ]}
                  onPress={() => setReportsTo('')}
                  disabled={isCreating}
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
                    Yourself (Default)
                  </Text>
                </TouchableOpacity>
                
                {availableManagers.map((manager) => (
                  <TouchableOpacity
                    key={manager.admin_id}
                    style={[
                      styles.reportsToOption,
                      reportsTo === manager.admin_id && styles.reportsToOptionSelected,
                    ]}
                    onPress={() => setReportsTo(manager.admin_id)}
                    disabled={isCreating}
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
                        @{manager.username}
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
                <Text style={styles.summaryTitle}>Admin Summary</Text>
                <View style={styles.summaryDetails}>
                  <Text style={styles.summaryText}>
                    • Phone: {phoneNumber || 'Not set'}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Username: {username || 'Not set'}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Full Name: {fullName || 'Not set'}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Role: {selectedRole?.role_name || 'Not selected'}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Reports To: {reportsTo ? 
                      availableManagers.find(m => m.admin_id === reportsTo)?.full_name || 'Manager' : 
                      'Yourself (Default)'}
                  </Text>
                </View>
              </View>
            </View>
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
                  (!phoneNumber.trim() || !username.trim() || !fullName.trim() || !selectedRole) && styles.submitButtonDisabled,
                ]}
                onPress={handleCreate}
                disabled={isCreating || !phoneNumber.trim() || !username.trim() || !fullName.trim() || !selectedRole}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="account-plus"
                      size={isTablet ? 20 : 16}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                      Create Admin
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

export default CreateAdminModal;