// components/MPINChangeModal.tsx
import React, { useState } from 'react';
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
import { Admin } from '@/types';
import styles from '../styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface MPINChangeModalProps {
  visible: boolean;
  onClose: () => void;
  admin: Admin | null;
  onChange: ({ adminId, newMPIN, reason }: { adminId: string; newMPIN: string; reason: string }) => void;
  isChanging: boolean;
}

const MPINChangeModal: React.FC<MPINChangeModalProps> = ({
  visible,
  onClose,
  admin,
  onChange,
  isChanging,
}) => {
  const [newMPIN, setNewMPIN] = useState('');
  const [confirmMPIN, setConfirmMPIN] = useState('');
  const [reason, setReason] = useState('');

  const resetForm = () => {
    setNewMPIN('');
    setConfirmMPIN('');
    setReason('');
  };

  const handleClose = () => {
    if (!isChanging) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = () => {
    if (!admin) return;

    if (!newMPIN.trim()) {
      Alert.alert('Error', 'New MPIN is required');
      return;
    }

    if (newMPIN.length !== 6) {
      Alert.alert('Error', 'MPIN must be exactly 6 digits');
      return;
    }

    if (!/^\d+$/.test(newMPIN)) {
      Alert.alert('Error', 'MPIN must contain only numbers');
      return;
    }

    if (newMPIN !== confirmMPIN) {
      Alert.alert('Error', 'MPINs do not match');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the change');
      return;
    }

    Alert.alert(
      'Reset MPIN',
      `Are you sure you want to reset MPIN for ${admin.full_name}?\n\nThis action will require the admin to use the new MPIN on next login.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset MPIN',
          style: 'destructive',
          onPress: () => {
            onChange({ adminId: admin.admin_id, newMPIN, reason: reason.trim() });
          },
        },
      ]
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
      <View style={styles.mpinModalOverlay}>
        <View style={[styles.mpinModalContent, isTablet && styles.mpinModalContentTablet]}>
          <View style={styles.mpinModalHeader}>
            <View>
              <Text style={[styles.mpinModalTitle, isTablet && styles.mpinModalTitleTablet]}>
                Reset Admin MPIN
              </Text>
              <Text style={[styles.mpinModalSubtitle, isTablet && styles.mpinModalSubtitleTablet]}>
                For: {admin.full_name}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={isChanging}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.mpinModalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Warning Card */}
            <View style={styles.warningCard}>
              <MaterialCommunityIcons name="shield-alert" size={24} color="#EF4444" />
              <View style={styles.warningContent}>
                <Text style={[styles.warningTitle, { color: '#EF4444' }]}>
                  Security Alert
                </Text>
                <Text style={[styles.warningText, { color: '#EF4444' }]}>
                  • This action resets the admin's MPIN{'\n'}
                  • The admin will need to use the new MPIN immediately{'\n'}
                  • This should only be done if the admin has lost access{'\n'}
                  • All actions are logged for security audit
                </Text>
              </View>
            </View>

            {/* New MPIN */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  New MPIN
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, isTablet && styles.textInputTablet]}
                value={newMPIN}
                onChangeText={setNewMPIN}
                placeholder="6-digit number"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                editable={!isChanging}
              />
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Enter a new 6-digit MPIN for the admin
              </Text>
            </View>

            {/* Confirm MPIN */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Confirm MPIN
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, isTablet && styles.textInputTablet]}
                value={confirmMPIN}
                onChangeText={setConfirmMPIN}
                placeholder="Re-enter 6-digit MPIN"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                editable={!isChanging}
              />
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Re-enter the MPIN to confirm
              </Text>
            </View>

            {/* Reason for Reset */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Reason for Reset
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea, isTablet && styles.textAreaTablet]}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g., Admin forgot MPIN, security reset, etc."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                editable={!isChanging}
              />
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Provide a detailed reason for resetting the MPIN
              </Text>
            </View>

            {/* Security Requirements */}
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: '#10B981' }]}>
                  Security Requirements
                </Text>
                <Text style={[styles.infoText, { color: '#10B981' }]}>
                  • MPIN must be 6 digits{'\n'}
                  • Cannot be sequential numbers (123456){'\n'}
                  • Cannot be repeated numbers (111111){'\n'}
                  • Should not contain personal information
                </Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#8B5CF6" />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Reset Summary</Text>
                <View style={styles.summaryDetails}>
                  <Text style={styles.summaryText}>
                    • Admin: {admin.full_name}
                  </Text>
                  <Text style={styles.summaryText}>
                    • MPIN Length: {newMPIN.length}/6 digits
                  </Text>
                  <Text style={styles.summaryText}>
                    • Match: {newMPIN && confirmMPIN ? (newMPIN === confirmMPIN ? '✓' : '✗') : 'Not checked'}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Reason: {reason || 'Not provided'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={styles.mpinModalSafeFooter}>
            <View style={styles.mpinModalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
                onPress={handleClose}
                disabled={isChanging}
              >
                <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isTablet && styles.submitButtonTablet,
                  isChanging && styles.submitButtonDisabled,
                  (!newMPIN.trim() || !confirmMPIN.trim() || !reason.trim() || newMPIN.length !== 6 || confirmMPIN.length !== 6 || newMPIN !== confirmMPIN) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  isChanging ||
                  !newMPIN.trim() ||
                  !confirmMPIN.trim() ||
                  !reason.trim() ||
                  newMPIN.length !== 6 ||
                  confirmMPIN.length !== 6 ||
                  newMPIN !== confirmMPIN
                }
              >
                {isChanging ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="shield-refresh"
                      size={isTablet ? 20 : 16}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                      Reset MPIN
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

export default MPINChangeModal;