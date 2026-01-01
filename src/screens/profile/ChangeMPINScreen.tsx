import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import MPINInput from '@/components/MPINInput';
import { getItem } from '@/services/storage';

// Define navigation types
type RootStackParamList = {
  MainDrawer: undefined;
  ChangeMPIN: undefined;
};

const ChangeMPINScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { adminInfo, logout } = useAuth();
  const { showToast } = useToast();

  const [currentMpin, setCurrentMpin] = useState('');
  const [newMpin, setNewMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [step, setStep] = useState(1); // 1: Current MPIN, 2: New MPIN, 3: Confirm MPIN
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const changeMPINMutation = useMutation({
    mutationFn: (data: { currentMpin: string; newMpin: string }) => 
      api.changeMPIN(adminInfo?.admin_id || '', data.currentMpin, data.newMpin),
    onSuccess: () => {
      showToast('success', 'MPIN changed successfully');
      
      // Logout user for security
      Alert.alert(
        'MPIN Changed',
        'For security reasons, please login with your new MPIN.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await logout();
            }
          }
        ]
      );
    },
    onError: (error: any) => {
      const errorType = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || 'Failed to change MPIN';

      if (errorType === 'invalid admin MPIN') {
        setError('Current MPIN is incorrect');
        setStep(1);
        setCurrentMpin('');
        setNewMpin('');
        setConfirmMpin('');
      } else if (errorType === 'admin MPIN is too weak') {
        setError('New MPIN is too weak. Please choose a stronger MPIN.');
        setStep(2);
        setNewMpin('');
        setConfirmMpin('');
      } else {
        showToast('error', errorMessage);
        setStep(1);
        setCurrentMpin('');
        setNewMpin('');
        setConfirmMpin('');
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleMPINComplete = (enteredMpin: string) => {
    if (step === 1) {
      // Verify current MPIN
      setCurrentMpin(enteredMpin);
      setError('');
      setStep(2);
    } else if (step === 2) {
      // Validate new MPIN
      if (isWeakMpin(enteredMpin)) {
        setError('MPIN is too weak. Please choose a stronger MPIN.');
        return;
      }

      if (enteredMpin === currentMpin) {
        setError('New MPIN cannot be same as current MPIN');
        return;
      }

      setNewMpin(enteredMpin);
      setError('');
      setStep(3);
    } else {
      // Confirm new MPIN
      if (enteredMpin === newMpin) {
        setIsLoading(true);
        changeMPINMutation.mutate({
          currentMpin,
          newMpin: enteredMpin
        });
      } else {
        setError('MPIN does not match. Please try again.');
        setStep(2);
        setNewMpin('');
        setConfirmMpin('');
      }
    }
  };

  const isWeakMpin = (mpin: string) => {
    const weakPatterns = [
      '111111', '222222', '333333', '444444', '555555',
      '666666', '777777', '888888', '999999', '000000',
      '123456', '654321', '121212', '123123', '112233'
    ];
    return weakPatterns.includes(mpin) || 
           mpin.split('').every((digit, i, arr) => digit === arr[0]);
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else if (step === 2) {
      setStep(1);
      setCurrentMpin('');
      setError('');
    } else if (step === 3) {
      setStep(2);
      setNewMpin('');
      setConfirmMpin('');
      setError('');
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Enter Current MPIN';
      case 2: return 'Enter New MPIN';
      case 3: return 'Confirm New MPIN';
      default: return 'Change MPIN';
    }
  };

  const getStepInstruction = () => {
    switch (step) {
      case 1: return 'Enter your current 6-digit MPIN';
      case 2: return 'Create a new 6-digit MPIN';
      case 3: return 'Re-enter the new MPIN to confirm';
      default: return '';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Change MPIN</Text>
          <Text style={styles.headerSubtitle}>Update your secure login PIN</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.stepIndicator}>
            <View style={[styles.step, step >= 1 && styles.activeStep]}>
              <Text style={[styles.stepText, step >= 1 && styles.activeStepText]}>1</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={[styles.step, step >= 2 && styles.activeStep]}>
              <Text style={[styles.stepText, step >= 2 && styles.activeStepText]}>2</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={[styles.step, step >= 3 && styles.activeStep]}>
              <Text style={[styles.stepText, step >= 3 && styles.activeStepText]}>3</Text>
            </View>
          </View>

          <Text style={styles.title}>{getStepTitle()}</Text>
          <Text style={styles.subtitle}>{getStepInstruction()}</Text>

          <View style={styles.mpinContainer}>
            <MPINInput
              onComplete={handleMPINComplete}
              error={!!error}
              disabled={isLoading}
              autoFocus={true}
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.guidelinesContainer}>
              <Text style={styles.guidelinesTitle}>
                {step === 1 ? 'Verification:' : 'MPIN Guidelines:'}
              </Text>
              {step === 1 ? (
                <>
                  <Text style={styles.guideline}>• Enter your current MPIN</Text>
                  <Text style={styles.guideline}>• This verifies your identity</Text>
                  <Text style={styles.guideline}>• Make sure no one is watching</Text>
                </>
              ) : step === 2 ? (
                <>
                  <Text style={styles.guideline}>• Must be 6 digits</Text>
                  <Text style={styles.guideline}>• Avoid simple patterns</Text>
                  <Text style={styles.guideline}>• Don't use repeated digits</Text>
                  <Text style={styles.guideline}>• Different from current MPIN</Text>
                </>
              ) : (
                <>
                  <Text style={styles.guideline}>• Re-enter the new MPIN</Text>
                  <Text style={styles.guideline}>• Make sure it matches exactly</Text>
                  <Text style={styles.guideline}>• You'll be logged out after change</Text>
                  <Text style={styles.guideline}>• Login with new MPIN</Text>
                </>
              )}
            </View>
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {step === 3 ? 'Changing MPIN...' : 'Verifying...'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>
              ← {step === 1 ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityInfo}>
          <Text style={styles.securityTitle}>Important Security Notes:</Text>
          <Text style={styles.securityText}>
            • You will be automatically logged out after MPIN change
            {'\n'}• Login immediately with your new MPIN
            {'\n'}• Never share your MPIN with anyone
            {'\n'}• Choose a MPIN you can remember but others can't guess
            {'\n'}• You can reset MPIN anytime from login screen
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>
            Changing MPIN for: {adminInfo?.full_name || 'Admin'}
          </Text>
          <Text style={styles.userInfoText}>
            Username: {adminInfo?.username || 'N/A'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  formContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#1565C0',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeStepText: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  mpinContainer: {
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
    errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  guidelinesContainer: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  guideline: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 18,
  },
  loadingContainer: {
    marginBottom: 24,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '500',
  },
  securityInfo: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  userInfo: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userInfoText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
});

export default ChangeMPINScreen;