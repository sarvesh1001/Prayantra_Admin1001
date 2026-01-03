// components/AdminDetailsModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AdminDetails } from '@/types';
import styles from '../styles';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface AdminDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  adminDetails: AdminDetails | null;
  isLoading: boolean;
  onEdit: () => void;
  onChangePhone: () => void;
  onChangeMPIN: () => void;
  onUpdateReportsTo: () => void;
  onToggleStatus: () => void;
  onViewHierarchy: () => void;
}

const AdminDetailsModal: React.FC<AdminDetailsModalProps> = ({
  visible,
  onClose,
  adminDetails,
  isLoading,
  onEdit,
  onChangePhone,
  onChangeMPIN,
  onUpdateReportsTo,
  onToggleStatus,
  onViewHierarchy,
}) => {
  const [showPermissions, setShowPermissions] = useState(false);
  const [showDepartments, setShowDepartments] = useState(false);

  if (!adminDetails) return null;

  const { admin, department_names, permission_names } = adminDetails;

  const renderStatusBadge = () => (
    <View style={[
      styles.statusBadge,
      admin.is_active ? styles.activeStatusBadge : styles.inactiveStatusBadge,
    ]}>
      <MaterialCommunityIcons
        name={admin.is_active ? "check-circle" : "close-circle"}
        size={12}
        color={admin.is_active ? "#10B981" : "#EF4444"}
      />
      <Text style={[
        styles.statusBadgeText,
        admin.is_active ? styles.activeStatusBadgeText : styles.inactiveStatusBadgeText,
      ]}>
        {admin.is_active ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );

  const renderRoleBadge = () => {
    const roleColors: Record<number, {
        bg: string;
        text: string;
        icon: IconName;
      }> = {
        1: { bg: '#FAF5FF', text: '#C084FC', icon: 'account' },
        2: { bg: '#F5F3FF', text: '#8B5CF6', icon: 'account-tie' },
        4: { bg: '#D1FAE5', text: '#10B981', icon: 'shield-account' },
      };
      
    const roleInfo = roleColors[admin.role_type as keyof typeof roleColors] || roleColors[2];
    
    return (
        
      <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
        <MaterialCommunityIcons
          name={roleInfo.icon}
          size={12}
          color={roleInfo.text}
        />
        <Text style={[styles.roleBadgeText, { color: roleInfo.text }]}>
          {admin.role_type === 1 ? 'Employee' : 
           admin.role_type === 2 ? 'Manager' : 
           'Super Admin'}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.adminDetailsModalOverlay}>
        <View style={[styles.adminDetailsModalContent, isTablet && styles.adminDetailsModalContentTablet]}>
          <View style={styles.adminDetailsModalHeader}>
            <View style={styles.adminDetailsTitleContainer}>
              <Text style={[styles.adminDetailsModalTitle, isTablet && styles.adminDetailsModalTitleTablet]}>
                Admin Details
              </Text>
              <Text style={[styles.adminDetailsModalSubtitle, isTablet && styles.adminDetailsModalSubtitleTablet]}>
                {admin.full_name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.adminDetailsModalBody}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#8B5CF6" style={styles.detailsLoader} />
            ) : (
              <>
                {/* Admin Header Info */}
                <View style={styles.adminDetailsHeader}>
                  <View style={styles.adminAvatarContainer}>
                    <MaterialCommunityIcons
                      name={
                        admin.role_type === 1 ? "account" :
                        admin.role_type === 2 ? "account-tie" :
                        "shield-account"
                      }
                      size={isTablet ? 48 : 40}
                      color="#8B5CF6"
                    />
                  </View>
                  <View style={styles.adminHeaderInfo}>
                    <View style={styles.adminHeaderNameRow}>
                      <Text style={[styles.adminDetailsName, isTablet && styles.adminDetailsNameTablet]}>
                        {admin.full_name}
                      </Text>
                      {renderStatusBadge()}
                    </View>
                    <Text style={styles.adminDetailsUsername}>
                      @{admin.username}
                    </Text>
                    <View style={styles.adminHeaderMeta}>
                      {renderRoleBadge()}
                      <View style={styles.adminHeaderMetaItem}>
                        <MaterialCommunityIcons name="calendar" size={12} color="#64748B" />
                        <Text style={styles.adminHeaderMetaText}>
                          Joined {new Date(admin.admin_created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      {admin.last_login && (
                        <View style={styles.adminHeaderMetaItem}>
                          <MaterialCommunityIcons name="clock" size={12} color="#64748B" />
                          <Text style={styles.adminHeaderMetaText}>
                            Last login: {new Date(admin.last_login).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.adminDetailsActions}>
                  <TouchableOpacity
                    style={[styles.adminDetailsActionButton, styles.editActionButton]}
                    onPress={onEdit}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color="#8B5CF6" />
                    <Text style={[styles.adminDetailsActionText, { color: '#8B5CF6' }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.adminDetailsActionButton, styles.phoneActionButton]}
                    onPress={onChangePhone}
                  >
                    <MaterialCommunityIcons name="phone" size={16} color="#64748B" />
                    <Text style={[styles.adminDetailsActionText, { color: '#64748B' }]}>
                      Change Phone
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.adminDetailsActionButton, styles.mpinActionButton]}
                    onPress={onChangeMPIN}
                  >
                    <MaterialCommunityIcons name="shield-key" size={16} color="#F59E0B" />
                    <Text style={[styles.adminDetailsActionText, { color: '#F59E0B' }]}>
                      Reset MPIN
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Admin Information */}
                <View style={styles.adminInfoSection}>
                  <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                    Admin Information
                  </Text>
                  <View style={styles.adminInfoGrid}>
                    <View style={styles.adminInfoItem}>
                      <Text style={styles.adminInfoLabel}>Admin ID</Text>
                      <Text style={styles.adminInfoValue} numberOfLines={1}>
                        {admin.admin_id}
                      </Text>
                    </View>
                    <View style={styles.adminInfoItem}>
                      <Text style={styles.adminInfoLabel}>Created By</Text>
                      <Text style={styles.adminInfoValue}>
                        {admin.admin_created_by === admin.admin_id ? 'Self' : 'Another Admin'}
                      </Text>
                    </View>
                    <View style={styles.adminInfoItem}>
                      <Text style={styles.adminInfoLabel}>Failed Logins</Text>
                      <Text style={styles.adminInfoValue}>
                        {admin.failed_login_attempts}
                      </Text>
                    </View>
                    <View style={styles.adminInfoItem}>
                      <Text style={styles.adminInfoLabel}>IP Whitelist</Text>
                      <Text style={styles.adminInfoValue}>
                        {admin.ip_whitelist?.join(', ') || 'All IPs'}
                      </Text>
                    </View>
                    <View style={[styles.adminInfoItem, styles.fullWidthItem]}>
                      <Text style={styles.adminInfoLabel}>Data Access Scope</Text>
                      <Text style={styles.adminInfoValue}>
                        {admin.data_access_scope?.join(', ') || 'All Data'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Departments Section */}
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => setShowDepartments(!showDepartments)}
                  >
                    <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                      Departments ({department_names.length})
                    </Text>
                    <View style={styles.sectionHeaderRight}>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{department_names.length}</Text>
                      </View>
                      <MaterialCommunityIcons
                        name={showDepartments ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#64748B"
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {showDepartments && (
                    <View style={styles.departmentsGrid}>
                      {department_names.map((dept, index) => (
                        <View key={index} style={styles.departmentChip}>
                          <MaterialCommunityIcons
                            name="office-building"
                            size={16}
                            color="#8B5CF6"
                            style={styles.departmentIcon}
                          />
                          <Text style={styles.departmentNameDetails}>{dept}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Permissions Section */}
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => setShowPermissions(!showPermissions)}
                  >
                    <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                      Permissions ({permission_names.length})
                    </Text>
                    <View style={styles.sectionHeaderRight}>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{permission_names.length}</Text>
                      </View>
                      <MaterialCommunityIcons
                        name={showPermissions ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#64748B"
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {showPermissions && (
                    <View style={styles.permissionsListContainer}>
                      {permission_names.map((perm, index) => {
                        const parts = perm.split('.');
                        const category = parts[0];
                        const action = parts[1] || '';
                        
                        return (
                          <View key={index} style={styles.permissionRow}>
                            <View style={styles.permissionHeader}>
                              <Text style={styles.permissionName}>{perm}</Text>
                              <View style={styles.permissionBadge}>
                                <Text style={styles.permissionBadgeText}>{category}</Text>
                              </View>
                            </View>
                            {action && (
                              <Text style={styles.permissionActionText}>
                                Action: {action.replace('_', ' ')}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Additional Actions */}
                <View style={styles.additionalActions}>
                  <TouchableOpacity
                    style={[styles.additionalActionButton, styles.hierarchyActionButton]}
                    onPress={onViewHierarchy}
                  >
                    <MaterialCommunityIcons name="sitemap" size={16} color="#8B5CF6" />
                    <Text style={[styles.additionalActionText, { color: '#8B5CF6' }]}>
                      View Hierarchy
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.additionalActionButton, styles.reportsToActionButton]}
                    onPress={onUpdateReportsTo}
                  >
                    <MaterialCommunityIcons name="account-arrow-right" size={16} color="#64748B" />
                    <Text style={[styles.additionalActionText, { color: '#64748B' }]}>
                      Change Reports To
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.additionalActionButton,
                      admin.is_active ? styles.deactivateActionButton : styles.activateActionButton,
                    ]}
                    onPress={onToggleStatus}
                  >
                    <MaterialCommunityIcons
                      name={admin.is_active ? "account-off" : "account-check"}
                      size={16}
                      color={admin.is_active ? "#EF4444" : "#10B981"}
                    />
                    <Text style={[
                      styles.additionalActionText,
                      { color: admin.is_active ? "#EF4444" : "#10B981" },
                    ]}>
                      {admin.is_active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={styles.adminDetailsModalSafeFooter}>
            <View style={styles.adminDetailsModalFooter}>
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
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

export default AdminDetailsModal;