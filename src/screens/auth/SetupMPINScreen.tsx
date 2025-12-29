import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import { useNavigation, NavigationProp, RouteProp, useRoute } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import PrayantraLogo from '@/components/PrayantraLogo';
import MPINInput, { MPINInputRef } from '@/components/MPINInput';

type RootStackParamList = {
  LoginInitiate: undefined;
  SendOTP: { phoneNumber: string; adminId?: string };
  VerifyOTP: { phoneNumber: string; adminId?: string };
  SetupMPIN: { phoneNumber: string; adminId: string };
  VerifyMPIN: { phoneNumber?: string; adminId?: string };
  ForgotMPIN: { phoneNumber?: string };
  MainDashboard: undefined;
  Profile: undefined;
  ChangeMPIN: undefined;
  Department: { department: string };
};

type SetupMPINScreenRouteProp = RouteProp<RootStackParamList, 'SetupMPIN'>;

const SetupMPINScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<SetupMPINScreenRouteProp>();
  const { phoneNumber, adminId } = route.params;
  
  const { login, storePhoneNumber } = useAuth();
  const { showToast } = useToast();

  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const mpinInputRef = useRef<MPINInputRef>(null);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const setupMPINMutation = useMutation({
    mutationFn: (mpin: string) => api.setupMPIN(adminId, mpin),
    onSuccess: (response: any) => {
      // After MPIN setup, verify it to get tokens
      api.verifyMPIN(phoneNumber, mpin)
        .then(verifyResponse => {
          const { admin, tokens, message } = verifyResponse.data.data;
          // Store phone number permanently
          storePhoneNumber(phoneNumber, admin.admin_id);
          login(phoneNumber, tokens, admin);
          showToast('success', message || 'MPIN setup successful');
        })
        .catch(error => {
          // If verification fails, still store phone number and redirect to verify MPIN
          showToast('success', 'MPIN setup successful. Please login with your MPIN.');
          storePhoneNumber(phoneNumber, adminId);
          navigation.navigate('VerifyMPIN', { phoneNumber });
        });
    },
    onError: (error: any) => {
      const errorType = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || 'Failed to setup MPIN';

      if (errorType === 'admin MPIN already exists') {
        Alert.alert(
          'MPIN Already Exists',
          'MPIN is already setup for this account. Please login with your MPIN.',
          [{ text: 'OK', onPress: () => navigation.navigate('VerifyMPIN', { phoneNumber }) }]
        );
      } else if (errorType === 'admin MPIN is too weak') {
        setError('MPIN is too weak. Please use a stronger MPIN.');
        setStep(1);
        setMpin('');
        setConfirmMpin('');
        mpinInputRef.current?.clearAll();
      } else {
        showToast('error', errorMessage);
        setStep(1);
        setMpin('');
        setConfirmMpin('');
        mpinInputRef.current?.clearAll();
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleMPINSubmit = (enteredMpin: string) => {
    if (step === 1) {
      // Validate MPIN strength
      if (isWeakMpin(enteredMpin)) {
        setError('MPIN is too common. Please choose a stronger MPIN.');
        return;
      }

      setMpin(enteredMpin);
      setError('');
      setStep(2);
      mpinInputRef.current?.clearAll();
    } else {
      setConfirmMpin(enteredMpin);
      
      if (enteredMpin === mpin) {
        setIsLoading(true);
        setupMPINMutation.mutate(enteredMpin);
      } else {
        setError('MPIN does not match. Please try again.');
        setConfirmMpin('');
        mpinInputRef.current?.clearAll();
      }
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setConfirmMpin('');
      setError('');
      mpinInputRef.current?.clearAll();
    } else {
      navigation.goBack();
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 40 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <PrayantraLogo size={100} />
          <Text style={styles.appName}>Prayantra</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {step === 1 ? 'Setup MPIN' : 'Confirm MPIN'}
          </Text>
          
          <Text style={styles.subtitle}>
            {step === 1 
              ? 'Create a 6-digit MPIN for secure login' 
              : 'Re-enter your MPIN to confirm'}
          </Text>

          <View style={styles.stepIndicator}>
            <View style={[styles.step, step === 1 && styles.activeStep]}>
              <Text style={[styles.stepText, step === 1 && styles.activeStepText]}>1</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={[styles.step, step === 2 && styles.activeStep]}>
              <Text style={[styles.stepText, step === 2 && styles.activeStepText]}>2</Text>
            </View>
          </View>

          <View style={styles.mpinContainer}>
            <MPINInput
              ref={mpinInputRef}
              onSubmit={handleMPINSubmit}
              error={!!error}
              disabled={isLoading}
              autoFocus={true}
              showSubmitButton={true}
              secureTextEntry={true}
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.guidelinesContainer}>
              <Text style={styles.guidelinesTitle}>
                {step === 1 ? 'MPIN Guidelines:' : 'Almost there!'}
              </Text>
              {step === 1 ? (
                <>
                  <Text style={styles.guideline}>• Must be 6 digits</Text>
                  <Text style={styles.guideline}>• Avoid simple patterns (111111, 123456)</Text>
                  <Text style={styles.guideline}>• Don't use repeated digits</Text>
                  <Text style={styles.guideline}>• Choose something memorable but secure</Text>
                </>
              ) : (
                <>
                  <Text style={styles.guideline}>• Re-enter the same 6-digit MPIN</Text>
                  <Text style={styles.guideline}>• Make sure it matches exactly</Text>
                  <Text style={styles.guideline}>• This will be your login password</Text>
                </>
              )}
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {step === 2 ? 'Setting up MPIN...' : 'Processing...'}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>
              ← {step === 2 ? 'Back to enter MPIN' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityInfo}>
          <Text style={styles.securityTitle}>Security First:</Text>
          <Text style={styles.securityText}>
            • Your MPIN is encrypted and stored securely
            {'\n'}• Never share your MPIN with anyone
            {'\n'}• You can change MPIN anytime from settings
            {'\n'}• Contact admin if you forget your MPIN
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
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    marginTop: 12,
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
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
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
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#8B5CF6',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeStepText: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  mpinContainer: {
    marginBottom: 24,
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
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  guidelinesContainer: {
    backgroundColor: '#F5F3FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  guideline: {
    fontSize: 13,
    color: '#6D28D9',
    marginBottom: 4,
    lineHeight: 18,
  },
  loadingContainer: {
    marginBottom: 24,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  securityInfo: {
    marginTop: 32,
    backgroundColor: '#F5F3FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#6D28D9',
    lineHeight: 18,
  },
});

export default SetupMPINScreen;