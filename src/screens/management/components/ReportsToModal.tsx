// components/ReportsToModal.tsx
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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Admin } from '@/types';
import styles from '../styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

interface ReportsToModalProps {
  visible: boolean;
  onClose: () => void;
  admin: Admin | null;
  availableManagers: Admin[];
  onUpdate: ({ adminId, reportsTo }: { adminId: string; reportsTo: string }) => void;
  isUpdating: boolean;
}

interface ManagerListItem {
  item: Admin;
}

const ReportsToModal: React.FC<ReportsToModalProps> = ({
  visible,
  onClose,
  admin,
  availableManagers,
  onUpdate,
  isUpdating,
}) => {
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredManagers, setFilteredManagers] = useState<Admin[]>([]);

  useEffect(() => {
    if (visible && admin) {
      setSelectedManager(admin.reports_to || '');
      setSearchQuery('');
    }
  }, [visible, admin]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = availableManagers.filter(manager =>
        manager.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        manager.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredManagers(filtered);
    } else {
      setFilteredManagers(availableManagers);
    }
  }, [searchQuery, availableManagers]);

  const resetForm = () => {
    setSelectedManager('');
    setSearchQuery('');
  };

  const handleClose = () => {
    if (!isUpdating) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = () => {
    if (!admin) return;

    Alert.alert(
      'Update Reports To',
      `Are you sure you want to update ${admin.full_name}'s reporting structure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          style: 'default',
          onPress: () => {
            onUpdate({ adminId: admin.admin_id, reportsTo: selectedManager });
          },
        },
      ]
    );
  };

  const renderManagerItem = ({ item }: ManagerListItem) => {
    const isSelected = selectedManager === item.admin_id;
    const isCurrent = admin?.reports_to === item.admin_id;
    const isSelf = item.admin_id === admin?.admin_id;

    if (isSelf) return null;

    return (
      <TouchableOpacity
        style={[
          styles.managerItem,
          isSelected && styles.managerItemSelected,
          isTablet && styles.managerItemTablet,
          isCurrent && styles.currentManagerItem,
        ]}
        onPress={() => setSelectedManager(item.admin_id)}
        disabled={isUpdating}
      >
        <View style={styles.managerIconContainer}>
          <MaterialCommunityIcons
            name={item.role_type === 2 ? "account-tie" : "account"}
            size={isTablet ? 24 : 20}
            color={
              isSelected ? '#8B5CF6' :
              isCurrent ? '#10B981' :
              '#64748B'
            }
          />
        </View>
        <View style={styles.managerTextContainer}>
          <Text
            style={[
              styles.managerName,
              isSelected && styles.managerNameSelected,
              isCurrent && styles.currentManagerName,
              isTablet && styles.managerNameTablet,
            ]}
            numberOfLines={1}
          >
            {item.full_name}
          </Text>
          <Text
            style={[
              styles.managerRole,
              isTablet && styles.managerRoleTablet,
            ]}
            numberOfLines={1}
          >
            @{item.username} • {item.role_name}
          </Text>
          <View style={styles.managerMeta}>
            {isCurrent && (
              <View style={styles.currentBadgeSmall}>
                <Text style={styles.currentBadgeTextSmall}>Current</Text>
              </View>
            )}
            {item.is_active ? (
              <View style={styles.activeBadgeSmall}>
                <Text style={styles.activeBadgeTextSmall}>Active</Text>
              </View>
            ) : (
              <View style={styles.inactiveBadgeSmall}>
                <Text style={styles.inactiveBadgeTextSmall}>Inactive</Text>
              </View>
            )}
          </View>
        </View>
        <MaterialCommunityIcons
          name={isSelected ? "check-circle" : "circle-outline"}
          size={isTablet ? 22 : 18}
          color={isSelected ? '#8B5CF6' : '#CBD5E1'}
        />
      </TouchableOpacity>
    );
  };

  if (!admin) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.reportsToModalOverlay}>
        <View style={[styles.reportsToModalContent, isTablet && styles.reportsToModalContentTablet]}>
          <View style={styles.reportsToModalHeader}>
            <View>
              <Text style={[styles.reportsToModalTitle, isTablet && styles.reportsToModalTitleTablet]}>
                Update Reports To
              </Text>
              <Text style={[styles.reportsToModalSubtitle, isTablet && styles.reportsToModalSubtitleTablet]}>
                For: {admin.full_name}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={isUpdating}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.reportsToModalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current Manager Info */}
            {admin.reports_to_name && (
              <View style={styles.currentManagerCard}>
                <MaterialCommunityIcons name="account-arrow-right" size={24} color="#8B5CF6" />
                <View style={styles.currentManagerContent}>
                  <Text style={styles.currentManagerTitle}>Currently Reports To</Text>
                  <Text style={styles.currentManagerName}>
                    {admin.reports_to_name}
                  </Text>
                  <Text style={styles.currentManagerNote}>
                    This admin currently reports to {admin.reports_to_name}
                  </Text>
                </View>
              </View>
            )}

            {/* No Manager Selected */}
            {!admin.reports_to && (
              <View style={styles.noManagerCard}>
                <MaterialCommunityIcons name="account-off" size={24} color="#94A3B8" />
                <View style={styles.noManagerContent}>
                  <Text style={styles.noManagerTitle}>No Manager Assigned</Text>
                  <Text style={styles.noManagerText}>
                    This admin does not currently report to anyone
                  </Text>
                </View>
              </View>
            )}

            {/* Manager Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                Select New Manager
              </Text>
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Choose who this admin should report to
              </Text>

              {/* Search */}
              <View style={[styles.searchContainer, styles.managerSearch]}>
                <MaterialCommunityIcons name="magnify" size={16} color="#64748B" />
                <TextInput
                  style={[styles.searchInput, styles.managerSearchInput]}
                  placeholder="Search managers..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  editable={!isUpdating}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* No Manager Option */}
              <TouchableOpacity
                style={[
                  styles.noManagerOption,
                  !selectedManager && styles.noManagerOptionSelected,
                ]}
                onPress={() => setSelectedManager('')}
                disabled={isUpdating}
              >
                <MaterialCommunityIcons
                  name="account-off"
                  size={20}
                  color={!selectedManager ? '#8B5CF6' : '#64748B'}
                />
                <Text style={[
                  styles.noManagerOptionText,
                  !selectedManager && styles.noManagerOptionTextSelected,
                ]}>
                  No Manager (Independent)
                </Text>
                <MaterialCommunityIcons
                  name={!selectedManager ? "check-circle" : "circle-outline"}
                  size={20}
                  color={!selectedManager ? '#8B5CF6' : '#CBD5E1'}
                />
              </TouchableOpacity>

              {/* Manager List */}
              <FlatList
                data={filteredManagers}
                renderItem={renderManagerItem}
                keyExtractor={(item: Admin) => item.admin_id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.noManagers}>
                    <MaterialCommunityIcons name="account-search" size={40} color="#CBD5E1" />
                    <Text style={styles.noManagersText}>
                      {searchQuery ? 'No managers found' : 'No managers available'}
                    </Text>
                  </View>
                }
              />
            </View>

            {/* Hierarchy Info */}
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="sitemap" size={20} color="#8B5CF6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Hierarchy Information</Text>
                <Text style={styles.infoText}>
                  • Managers can only be admins with role type 2 (Manager) or 4 (Super Admin){'\n'}
                  • An admin cannot report to themselves{'\n'}
                  • Circular reporting structures are not allowed{'\n'}
                  • Changes may affect permission inheritance
                </Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#8B5CF6" />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Update Summary</Text>
                <View style={styles.summaryDetails}>
                  <Text style={styles.summaryText}>
                    • Admin: {admin.full_name}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Current Manager: {admin.reports_to_name || 'None'}
                  </Text>
                  <Text style={styles.summaryText}>
                    • New Manager: {
                      selectedManager ?
                      availableManagers.find(m => m.admin_id === selectedManager)?.full_name || 'Manager' :
                      'None (Independent)'
                    }
                  </Text>
                  <Text style={styles.summaryText}>
                    • Change: {admin.reports_to === selectedManager ? 'No change' : 'Yes'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={styles.reportsToModalSafeFooter}>
            <View style={styles.reportsToModalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
                onPress={handleClose}
                disabled={isUpdating}
              >
                <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isTablet && styles.submitButtonTablet,
                  isUpdating && styles.submitButtonDisabled,
                  (admin.reports_to === selectedManager) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isUpdating || (admin.reports_to === selectedManager)}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="account-arrow-right"
                      size={isTablet ? 20 : 16}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                      Update Reports To
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

export default ReportsToModal;