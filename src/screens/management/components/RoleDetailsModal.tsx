import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RoleDetails, Permission } from '@/types';
import styles from '../styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface RoleDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  roleDetails: RoleDetails | null;
  isLoading: boolean;
}

const RoleDetailsModal: React.FC<RoleDetailsModalProps> = ({ visible, onClose, roleDetails, isLoading }) => {
  if (!roleDetails) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.roleDetailsModalOverlay}>
        <View style={[styles.roleDetailsModalContent, isTablet && styles.roleDetailsModalContentTablet]}>
          <View style={styles.roleDetailsModalHeader}>
            <View style={styles.roleDetailsTitleContainer}>
              <Text style={[styles.roleDetailsModalTitle, isTablet && styles.roleDetailsModalTitleTablet]}>
                Role Details
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
                      <Text style={styles.infoValue}>
                        {roleDetails.role.role_type === 1 ? 'Employee' :
                         roleDetails.role.role_type === 2 ? 'Manager' :
                         roleDetails.role.role_type === 3 ? 'Admin' :
                         'Super Admin'}
                      </Text>
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
                      Departments ({roleDetails.departments.length})
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{roleDetails.departments.length}</Text>
                    </View>
                  </View>
                  <View style={styles.departmentsGrid}>
                    {roleDetails.departments.map((dept, index) => (
                      <View key={dept.system_department_id} style={styles.departmentChip}>
                        <MaterialCommunityIcons
                          name="office-building"
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
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
                      Permissions ({roleDetails.permissions.length})
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{roleDetails.permissions.length}</Text>
                    </View>
                  </View>
                  <View style={styles.permissionsListContainer}>
                    {roleDetails.permissions.map((perm: Permission, index: number) => (
                      <View key={perm.permission_id} style={styles.permissionRow}>
                        <View style={styles.permissionHeader}>
                          <Text style={styles.permissionName}>{perm.permission_name}</Text>
                          <View style={styles.permissionBadge}>
                            <Text style={styles.permissionBadgeText}>{perm.module}</Text>
                          </View>
                        </View>
                        <Text style={styles.permissionDescription}>{perm.description}</Text>
                        <View style={styles.permissionMeta}>
                          <View style={styles.permissionMetaItem}>
                            <MaterialCommunityIcons name="tag" size={12} color="#64748B" />
                            <Text style={styles.permissionMetaText}>{perm.category}</Text>
                          </View>
                          <View style={styles.permissionMetaItem}>
                            <MaterialCommunityIcons name="shield" size={12} color="#64748B" />
                            <Text style={styles.permissionMetaText}>{perm.scope}</Text>
                          </View>
                          <View style={styles.permissionMetaItem}>
                            <MaterialCommunityIcons name="star" size={12} color="#64748B" />
                            <Text style={styles.permissionMetaText}>{perm.requires_tier}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={styles.roleDetailsModalSafeFooter}>
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
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

export default RoleDetailsModal;