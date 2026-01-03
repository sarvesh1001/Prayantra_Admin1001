// components/PhoneChangeModal.tsx
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

interface PhoneChangeModalProps {
  visible: boolean;
  onClose: () => void;
  admin: Admin | null;
  currentPhone: string | undefined;
  onChange: ({ adminId, newPhone }: { adminId: string; newPhone: string }) => void;
  isChanging: boolean;
}

const PhoneChangeModal: React.FC<PhoneChangeModalProps> = ({
  visible,
  onClose,
  admin,
  currentPhone,
  onChange,
  isChanging,
}) => {
  const [newPhone, setNewPhone] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [reason, setReason] = useState('');

  const resetForm = () => {
    setNewPhone('');
    setConfirmPhone('');
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

    if (!newPhone.trim()) {
      Alert.alert('Error', 'New phone number is required');
      return;
    }

    if (newPhone !== confirmPhone) {
      Alert.alert('Error', 'Phone numbers do not match');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the change');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(newPhone.replace(/\D/g, ''))) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    Alert.alert(
      'Confirm Phone Change',
      `Are you sure you want to change ${admin.full_name}'s phone number?\n\nFrom: ${currentPhone || 'Not available'}\nTo: ${newPhone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Phone',
          style: 'destructive',
          onPress: () => {
            onChange({ adminId: admin.admin_id, newPhone: newPhone.trim() });
          },
        },
      ]
    );
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (text: string, setter: (value: string) => void) => {
    const formatted = formatPhoneNumber(text);
    setter(formatted);
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
      <View style={styles.phoneModalOverlay}>
        <View style={[styles.phoneModalContent, isTablet && styles.phoneModalContentTablet]}>
          <View style={styles.phoneModalHeader}>
            <View>
              <Text style={[styles.phoneModalTitle, isTablet && styles.phoneModalTitleTablet]}>
                Change Phone Number
              </Text>
              <Text style={[styles.phoneModalSubtitle, isTablet && styles.phoneModalSubtitleTablet]}>
                For: {admin.full_name}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={isChanging}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.phoneModalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current Phone Info */}
            <View style={styles.phoneInfoCard}>
              <MaterialCommunityIcons name="phone" size={24} color="#8B5CF6" />
              <View style={styles.phoneInfoContent}>
                <Text style={styles.phoneInfoTitle}>Current Phone Number</Text>
                <Text style={styles.phoneInfoNumber}>
                  {currentPhone || 'Not available'}
                </Text>
                <Text style={styles.phoneInfoNote}>
                  This is the phone number currently associated with {admin.full_name}'s account
                </Text>
              </View>
            </View>

            {/* New Phone Number */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  New Phone Number
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, isTablet && styles.textInputTablet]}
                value={newPhone}
                onChangeText={(text) => handlePhoneChange(text, setNewPhone)}
                placeholder="(555) 123-4567"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                editable={!isChanging}
              />
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Enter the new phone number including country code
              </Text>
            </View>

            {/* Confirm Phone Number */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Confirm Phone Number
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, isTablet && styles.textInputTablet]}
                value={confirmPhone}
                onChangeText={(text) => handlePhoneChange(text, setConfirmPhone)}
                placeholder="(555) 123-4567"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                editable={!isChanging}
              />
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Re-enter the phone number to confirm
              </Text>
            </View>

            {/* Reason for Change */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Reason for Change
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea, isTablet && styles.textAreaTablet]}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g., Lost phone, new device, etc."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                editable={!isChanging}
              />
              <Text style={[styles.inputSubtext, isTablet && styles.inputSubtextTablet]}>
                Provide a reason for changing the phone number
              </Text>
            </View>

            {/* Important Note */}
            <View style={styles.warningCard}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F59E0B" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Important Information</Text>
                <Text style={styles.warningText}>
                  • Changing the phone number will require the admin to verify the new number{'\n'}
                  • The admin may need to log in again{'\n'}
                  • This action is logged for security purposes{'\n'}
                  • Only perform this change with proper authorization
                </Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#8B5CF6" />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Change Summary</Text>
                <View style={styles.summaryDetails}>
                  <Text style={styles.summaryText}>
                    • Admin: {admin.full_name}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Current Phone: {currentPhone || 'Not available'}
                  </Text>
                  <Text style={styles.summaryText}>
                    • New Phone: {newPhone || 'Not set'}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Reason: {reason || 'Not provided'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={styles.phoneModalSafeFooter}>
            <View style={styles.phoneModalFooter}>
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
                  (!newPhone.trim() || !confirmPhone.trim() || !reason.trim() || newPhone !== confirmPhone) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  isChanging ||
                  !newPhone.trim() ||
                  !confirmPhone.trim() ||
                  !reason.trim() ||
                  newPhone !== confirmPhone
                }
              >
                {isChanging ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="phone-sync"
                      size={isTablet ? 20 : 16}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                      Change Phone
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

export default PhoneChangeModal;