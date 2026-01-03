import React, { useState, useEffect } from 'react';
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
import { Department } from '@/types';
import styles from '../styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface PermissionSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (permissions: Record<string, string[]>) => void;
  initialPermissions: Record<string, string[]>;
  availablePermissions: Record<string, string[]>;
  selectedDepartments: Department[];
  isLoadingPermissions: boolean;
  isManagerRole: boolean;
}

const PermissionSelectionModal: React.FC<PermissionSelectionModalProps> = ({
  visible,
  onClose,
  onSave,
  initialPermissions,
  availablePermissions,
  selectedDepartments,
  isLoadingPermissions,
  isManagerRole,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>(initialPermissions);

  useEffect(() => {
    setSelectedPermissions(initialPermissions);
  }, [initialPermissions]);

  const togglePermission = (departmentName: string, permission: string) => {
    setSelectedPermissions(prev => {
      const currentPermissions = prev[departmentName] || [];
      if (currentPermissions.includes(permission)) {
        return {
          ...prev,
          [departmentName]: currentPermissions.filter(p => p !== permission),
        };
      } else {
        return {
          ...prev,
          [departmentName]: [...currentPermissions, permission],
        };
      }
    });
  };

  const toggleAllPermissions = (departmentName: string) => {
    const currentSelected = selectedPermissions[departmentName] || [];
    const allPermissions = availablePermissions[departmentName] || [];
    if (currentSelected.length === allPermissions.length) {
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: [],
      }));
    } else {
      setSelectedPermissions(prev => ({
        ...prev,
        [departmentName]: allPermissions,
      }));
    }
  };

  const handleSave = () => {
    const cleanedPermissions = Object.fromEntries(
      Object.entries(selectedPermissions).map(([dept, perms]) => [
        dept,
        perms || [],
      ])
    );

    onSave(cleanedPermissions);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.permissionModalOverlay}>
        <View style={[styles.permissionModalContent, isTablet && styles.permissionModalContentTablet]}>
          <View style={styles.permissionModalHeader}>
            <View>
              <Text style={[styles.permissionModalTitle, isTablet && styles.permissionModalTitleTablet]}>
                {isManagerRole ? 'Manager Permissions' : 'Select Permissions'}
              </Text>
              <Text style={[styles.permissionModalSubtitle, isTablet && styles.permissionModalSubtitleTablet]}>
                {isManagerRole
                  ? 'Manager roles automatically receive all permissions'
                  : 'Configure permissions for selected departments'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.permissionModalBody}
            showsVerticalScrollIndicator={false}
          >
            {selectedDepartments.map((dept, index) => {
              const departmentName = dept.name;
              const moduleCode = dept.module_code;
              const permissions = selectedPermissions[departmentName] || [];
              const allPermissions = availablePermissions[departmentName] || [];
              const isAllSelected = permissions.length === allPermissions.length && permissions.length > 0;

              return (
                <View key={dept.system_department_id} style={styles.permissionsSection}>
                  {isManagerRole ? (
                    <View style={styles.managerPermissionInfo}>
                      <MaterialCommunityIcons name="shield-check" size={20} color="#8B5CF6" />
                      <Text style={styles.managerPermissionText}>
                        Manager roles automatically get ALL permissions for the {departmentName} department
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.permissionsHeader}>
                        <View>
                          <Text style={[styles.permissionsTitle, isTablet && styles.permissionsTitleTablet]}>
                            {departmentName}
                          </Text>
                          <Text style={styles.permissionsModule}>
                            Module: {moduleCode}
                          </Text>
                        </View>
                        {allPermissions.length > 0 && (
                          <TouchableOpacity
                            style={styles.selectAllButton}
                            onPress={() => toggleAllPermissions(departmentName)}
                          >
                            <View style={{ width: 24, alignItems: 'center' }}>
                              <MaterialCommunityIcons
                                name="shield-edit"
                                size={isTablet ? 22 : 18}
                                color="#FFFFFF"
                              />
                            </View>
                            <Text style={[
                              styles.selectAllText,
                              isAllSelected && styles.selectAllTextSelected
                            ]}>
                              {isAllSelected ? 'Deselect All' : 'Select All'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {isLoadingPermissions ? (
                        <View style={styles.loadingPermissions}>
                          <ActivityIndicator size="small" color="#8B5CF6" />
                          <Text style={[styles.loadingTextLarge, isTablet && styles.loadingTextTablet]}>
                            Loading {moduleCode} permissions...
                          </Text>
                        </View>
                      ) : allPermissions.length === 0 ? (
                        <View style={styles.loadingPermissions}>
                          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#EF4444" />
                          <Text style={[styles.loadingTextLarge, isTablet && styles.loadingTextTablet]}>
                            No permissions available for {moduleCode} module
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.permissionsGrid}>
                          {allPermissions.map((permission: string) => {
                            const isSelected = permissions.includes(permission);
                            return (
                              <TouchableOpacity
                                key={permission}
                                style={[
                                  styles.permissionChip,
                                  isSelected && styles.permissionChipSelected,
                                  isTablet && styles.permissionChipTablet,
                                ]}
                                onPress={() => togglePermission(departmentName, permission)}
                              >
                                <MaterialCommunityIcons
                                  name={isSelected ? "check-circle" : "circle-outline"}
                                  size={isTablet ? 20 : 16}
                                  color={isSelected ? '#8B5CF6' : '#64748B'}
                                />
                                <Text
                                  style={[
                                    styles.permissionText,
                                    isSelected && styles.permissionTextSelected,
                                    isTablet && styles.permissionTextTablet,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {permission}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                      <Text style={styles.permissionsCount}>
                        {permissions.length} of {allPermissions.length} permissions selected
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={styles.permissionModalSafeFooter}>
            <View style={styles.permissionModalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, isTablet && styles.submitButtonTablet]}
                onPress={handleSave}
              >
                <MaterialCommunityIcons name="check" size={isTablet ? 24 : 20} color="#FFFFFF" />
                <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                  Save Permissions
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

export default PermissionSelectionModal;