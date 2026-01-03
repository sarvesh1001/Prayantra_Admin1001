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
import { Admin } from '@/types';
import styles from '../styles';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface PhoneChangeModalProps {
  visible: boolean;
  onClose: () => void;
  admin: Admin | null;
  currentPhone?: string;
  onChange: (payload: { adminId: string; newPhone: string }) => void;
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

  useEffect(() => {
    if (!visible) {
      setNewPhone('');
      setConfirmPhone('');
      setReason('');
    }
  }, [visible]);

  if (!admin) return null;

  const handleSubmit = () => {
    if (!newPhone.trim()) {
      Alert.alert('Error', 'New phone number is required');
      return;
    }

    if (newPhone.trim() !== confirmPhone.trim()) {
      Alert.alert('Error', 'Phone numbers do not match');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the change');
      return;
    }

    /**
     * ✅ E.164 VALIDATION
     * Examples:
     * +919315453437
     * +14155552671
     */
    const phoneRegex = /^\+[1-9]\d{9,14}$/;

    if (!phoneRegex.test(newPhone.trim())) {
      Alert.alert(
        'Invalid Phone Number',
        'Enter phone number in international format.\nExample: +919315453437'
      );
      return;
    }

    Alert.alert(
      'Confirm Phone Change',
      `Are you sure you want to change ${admin.full_name}'s phone number?\n\nFrom: ${
        currentPhone || 'Not available'
      }\nTo: ${newPhone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Phone',
          style: 'destructive',
          onPress: () =>
            onChange({
              adminId: admin.admin_id,
              newPhone: newPhone.trim(),
            }),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.phoneModalOverlay}>
        <View style={[styles.phoneModalContent, isTablet && styles.phoneModalContentTablet]}>
          {/* Header */}
          <View style={styles.phoneModalHeader}>
            <View>
              <Text style={[styles.phoneModalTitle, isTablet && styles.phoneModalTitleTablet]}>
                Change Phone Number
              </Text>
              <Text style={[styles.phoneModalSubtitle, isTablet && styles.phoneModalSubtitleTablet]}>
                For: {admin.full_name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isChanging}>
              <MaterialCommunityIcons name="close" size={isTablet ? 28 : 24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.phoneModalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Current Phone */}
            <View style={styles.phoneInfoCard}>
              <MaterialCommunityIcons name="phone" size={24} color="#8B5CF6" />
              <View style={styles.phoneInfoContent}>
                <Text style={styles.phoneInfoTitle}>Current Phone Number</Text>
                <Text style={styles.phoneInfoNumber}>
                  {currentPhone || 'Not available'}
                </Text>
              </View>
            </View>

            {/* New Phone */}
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
                onChangeText={setNewPhone}
                placeholder="+919315453437"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!isChanging}
              />
              <Text style={styles.inputSubtext}>
                Use international format (E.164)
              </Text>
            </View>

            {/* Confirm Phone */}
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
                onChangeText={setConfirmPhone}
                placeholder="+919315453437"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!isChanging}
              />
            </View>

            {/* Reason */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
                  Reason for Change
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder="Lost phone / new number"
                placeholderTextColor="#94A3B8"
                multiline
                editable={!isChanging}
              />
            </View>

            {/* Warning */}
            <View style={styles.warningCard}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                This action is logged and requires admin authorization.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <SafeAreaView edges={['bottom']} style={styles.phoneModalSafeFooter}>
            <View style={styles.phoneModalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={isChanging}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isChanging && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isChanging}
              >
                {isChanging ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="phone-sync" size={18} color="#FFF" />
                    <Text style={styles.submitButtonText}>Change Phone</Text>
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
