import React, { useState, useEffect, useRef } from 'react';
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
import { useNavigation, NavigationProp, RouteProp, useRoute } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useToast } from '@/components/Toast';
import PrayantraLogo from '@/components/PrayantraLogo';
import OTPInput from '@/components/OTPInput';
import MPINInput from '@/components/MPINInput';
import { getFormattedPhoneNumber } from '@/services/storage';

// Define navigation types
type RootStackParamList = {
  LoginInitiate: undefined;
  SendOTP: { phoneNumber: string; adminId?: string };
  VerifyOTP: { phoneNumber: string; adminId?: string };
  SetupMPIN: { phoneNumber: string; adminId: string };
  VerifyMPIN: { phoneNumber?: string; adminId?: string };
  ForgotMPIN: { phoneNumber?: string };
  MainDrawer: undefined;
};

type ForgotMPINScreenRouteProp = RouteProp<RootStackParamList, 'ForgotMPIN'>;

const ForgotMPINScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ForgotMPINScreenRouteProp>();
  const params = route.params;
  
  const { showToast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP, 3: Setup new MPIN
  const [otp, setOtp] = useState('');
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadPhoneNumber = async () => {
      if (params?.phoneNumber) {
        setPhoneNumber(params.phoneNumber);
      } else {
        const storedPhone = await getFormattedPhoneNumber();
        if (storedPhone) {
          setPhoneNumber(storedPhone);
        }
      }
    };
    loadPhoneNumber();
  }, [params?.phoneNumber]);

  useEffect(() => {
    if (step === 1) {
      startTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [step]);

  const startTimer = () => {
    setCanResend(false);
    setTimer(60);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const forgotMPINMutation = useMutation({
    mutationFn: () => api.forgotMPIN(phoneNumber),
    onSuccess: () => {
      showToast('success', 'OTP sent successfully for MPIN reset');
      setStep(2);
      startTimer();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to send OTP';
      showToast('error', errorMessage);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const verifyForgotMPINMutation = useMutation({
    mutationFn: (data: { otpCode: string; newMpin: string }) => 
      api.verifyForgotMPIN(phoneNumber, data.otpCode, data.newMpin),
    onSuccess: () => {
      showToast('success', 'MPIN reset successful. Please login with your new MPIN.');
      navigation.navigate('VerifyMPIN', { phoneNumber });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to reset MPIN';
      setError(errorMessage);
      showToast('error', errorMessage);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleRequestOTP = () => {
    if (!phoneNumber) {
      showToast('error', 'Please enter your phone number');
      return;
    }

    setIsLoading(true);
    forgotMPINMutation.mutate();
  };

  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      showToast('error', 'Please enter 6-digit OTP');
      return;
    }
    setStep(3);
  };

  const handleMPINComplete = (enteredMpin: string) => {
    if (mpin === '') {
      // First MPIN entry
      if (isWeakMpin(enteredMpin)) {
        setError('MPIN is too weak. Please choose a stronger MPIN.');
        return;
      }
      setMpin(enteredMpin);
      setError('');
    } else {
      // Confirm MPIN
      if (enteredMpin === mpin) {
        setIsLoading(true);
        verifyForgotMPINMutation.mutate({
          otpCode: otp,
          newMpin: enteredMpin
        });
      } else {
        setError('MPIN does not match. Please try again.');
        setMpin('');
      }
    }
  };

  const handleResendOTP = () => {
    if (!canResend && timer > 0) {
      showToast('info', `Please wait ${timer} seconds before resending`);
      return;
    }
    setIsLoading(true);
    forgotMPINMutation.mutate();
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.title}>Forgot MPIN</Text>
            <Text style={styles.subtitle}>
              Enter your registered phone number to reset MPIN
            </Text>

            <View style={styles.phoneContainer}>
              <Text style={styles.phoneLabel}>Phone Number</Text>
              <Text style={styles.phoneNumber}>{phoneNumber || 'Not set'}</Text>
            </View>

            <Text style={styles.instruction}>
              We'll send an OTP to verify your identity and reset your MPIN.
            </Text>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRequestOTP}
              disabled={isLoading || !phoneNumber}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Text>
            </TouchableOpacity>
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit OTP sent to {phoneNumber}
            </Text>

            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>
                OTP expires in: {timer}s
              </Text>
            </View>

            <OTPInput
              length={6}
              onComplete={setOtp}
              error={!!error}
              disabled={isLoading}
              autoFocus={true}
            />

            <TouchableOpacity
              style={[styles.button, (isLoading || otp.length !== 6) && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={isLoading || otp.length !== 6}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive OTP?</Text>
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={!canResend || isLoading}
              >
                <Text style={[
                  styles.resendButton,
                  (!canResend || isLoading) && styles.resendButtonDisabled
                ]}>
                  {canResend ? 'Resend OTP' : `Resend in ${timer}s`}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.title}>Set New MPIN</Text>
            <Text style={styles.subtitle}>
              {mpin ? 'Confirm your new MPIN' : 'Create a new 6-digit MPIN'}
            </Text>

            <MPINInput
              onComplete={handleMPINComplete}
              error={!!error}
              disabled={isLoading}
              autoFocus={true}
            />

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Setting up new MPIN...</Text>
              </View>
            )}

            <View style={styles.guidelines}>
              <Text style={styles.guidelinesTitle}>MPIN Guidelines:</Text>
              <Text style={styles.guideline}>• Must be 6 digits</Text>
              <Text style={styles.guideline}>• Avoid simple patterns</Text>
              <Text style={styles.guideline}>• Don't use repeated digits</Text>
              <Text style={styles.guideline}>• Choose something memorable</Text>
            </View>
          </>
        );
    }
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else if (step === 2) {
      setStep(1);
      setOtp('');
      setError('');
    } else if (step === 3) {
      setStep(2);
      setMpin('');
      setConfirmMpin('');
      setError('');
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
        <View style={styles.logoContainer}>
          <PrayantraLogo size={100} />
          <Text style={styles.appName}>Prayantra</Text>
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

          {renderStep()}

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>
              ← {step === 1 ? 'Back to Login' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityInfo}>
          <Text style={styles.securityTitle}>Security Information:</Text>
          <Text style={styles.securityText}>
            • MPIN reset requires OTP verification
            {'\n'}• OTP is valid for 10 minutes only
            {'\n'}• Your old MPIN will be permanently deleted
            {'\n'}• Contact admin if you face issues
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
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C084FC', // Purple
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
    backgroundColor: '#C084FC', // Purple
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
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  phoneContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  phoneLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  instruction: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  timerContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  timerText: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#C084FC', // Purple
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#D8B4FE', // Light purple
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 4,
  },
  resendButton: {
    fontSize: 14,
    color: '#C084FC', // Purple
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#D8B4FE', // Light purple
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  guidelines: {
    backgroundColor: '#FAF5FF', // Light purple
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C084FC', // Purple
    marginBottom: 8,
  },
  guideline: {
    fontSize: 13,
    color: '#6B21A8',
    marginBottom: 4,
    lineHeight: 18,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  backButtonText: {
    color: '#C084FC', // Purple
    fontSize: 14,
    fontWeight: '500',
  },
  securityInfo: {
    marginTop: 32,
    backgroundColor: '#FAF5FF', // Light purple
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C084FC', // Purple
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#6B21A8',
    lineHeight: 18,
  },
});

export default ForgotMPINScreen;