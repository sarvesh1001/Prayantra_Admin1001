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
  Keyboard,
  Dimensions,
} from 'react-native';
import { useNavigation, NavigationProp, RouteProp, useRoute } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import PrayantraLogo from '@/components/PrayantraLogo';
import OTPInput, { OTPInputRef } from '@/components/OTPInput';

const { height } = Dimensions.get('window');

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

type VerifyOTPScreenRouteProp = RouteProp<RootStackParamList, 'VerifyOTP'>;

const VerifyOTPScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<VerifyOTPScreenRouteProp>();
  const { phoneNumber, adminId } = route.params;
  
  const { login, storePhoneNumber } = useAuth();
  const { showToast } = useToast();

  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(600);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const otpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const otpInputRef = useRef<OTPInputRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    startOtpTimer();
    startResendCooldown();

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 100, animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
      }
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
      }
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (otp.length === 6 && !isLoading) {
      handleVerifyOTP();
    }
  }, [otp]);

  const startOtpTimer = () => {
    if (otpTimerRef.current) {
      clearInterval(otpTimerRef.current);
    }

    otpTimerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          if (otpTimerRef.current) {
            clearInterval(otpTimerRef.current);
          }
          setError('OTP has expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startResendCooldown = (seconds: number = 60) => {
    setResendCooldown(seconds);
    
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
    }

    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const verifyOTPMutation = useMutation({
    mutationFn: (otpCode: string) => api.verifyOTP(phoneNumber, otpCode),
    onSuccess: (response: any) => {
      const { 
        has_mpin, 
        device_trusted, 
        admin_id, 
        message 
      } = response.data.data;
      
      console.log('✅ OTP verified:', { 
        has_mpin, 
        device_trusted, 
        admin_id,
        adminId 
      });
      
      // Store phone number and admin ID permanently
      const adminIdToStore = admin_id || adminId;
      if (adminIdToStore) {
        // Store phone number in format +919876543210 (without spaces)
        storePhoneNumber(phoneNumber, adminIdToStore);
      }

      if (has_mpin) {
        showToast('success', message || 'Device verified successfully');
        navigation.navigate('VerifyMPIN', { 
          phoneNumber,
          adminId: adminIdToStore 
        });
      } else {
        showToast('success', 'Device verified. Please setup your MPIN');
        navigation.navigate('SetupMPIN', { 
          phoneNumber,
          adminId: adminIdToStore 
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ OTP verification error:', error.response?.data);
      
      const errorType = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || 'OTP verification failed';
      
      if (errorType === 'phone number not registered') {
        setError('Phone number not registered. Please contact administrator.');
        Alert.alert(
          'Phone Not Registered',
          'This phone number is not registered. Please contact your administrator.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        setError(errorMessage);
        setOtp('');
        otpInputRef.current?.clearAll();
        showToast('error', errorMessage);
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const resendOTPMutation = useMutation({
    mutationFn: () => api.sendOTP(phoneNumber, 'admin_login'),
    onSuccess: () => {
      showToast('success', 'OTP resent successfully');
      setOtpTimer(600);
      setError('');
      setOtp('');
      otpInputRef.current?.clearAll();
      startOtpTimer();
      setIsResendLoading(false);
    },
    onError: (error: any) => {
      console.error('❌ Resend OTP error:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP';
      
      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retry_after || 60;
        startResendCooldown(retryAfter);
        showToast('error', `Too many requests. Please wait ${retryAfter} seconds`);
      } else if (error.response?.status === 500 && error.response.data?.error === 'phone number not registered') {
        Alert.alert(
          'Phone Not Registered',
          'This phone number is not registered. Please contact your administrator.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        showToast('error', errorMessage);
      }
      setIsResendLoading(false);
    },
  });

  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      setError('Please enter 6-digit OTP');
      return;
    }

    if (otpTimer <= 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);
    setError('');
    verifyOTPMutation.mutate(otp);
  };

  const handleResendOTP = () => {
    if (resendCooldown > 0) {
      showToast('info', `Please wait ${resendCooldown} seconds before resending`);
      return;
    }
    
    setIsResendLoading(true);
    resendOTPMutation.mutate();
  };

  const handleGoBack = () => {
    navigation.navigate('SendOTP', { phoneNumber, adminId });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            minHeight: keyboardHeight > 0 ? height : undefined,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 40 
          }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
      >
        <View style={styles.logoContainer}>
          <PrayantraLogo size={100} />
          <Text style={styles.appName}>Prayantra</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP sent to your phone
          </Text>

          <View style={styles.phoneContainer}>
            <Text style={styles.phoneLabel}>Phone Number</Text>
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </View>

          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>OTP expires in: {formatTime(otpTimer)}</Text>
          </View>

          <OTPInput
            ref={otpInputRef}
            length={6}
            onComplete={setOtp}
            error={!!error}
            disabled={isLoading}
            autoFocus={true}
            showSubmitButton={false}
          />

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Verifying OTP...</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.verifyButton, 
              (isLoading || otp.length !== 6) && styles.buttonDisabled
            ]}
            onPress={handleVerifyOTP}
            disabled={isLoading || otp.length !== 6}
          >
            <Text style={styles.verifyButtonText}>
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive OTP?</Text>
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={isResendLoading || resendCooldown > 0}
            >
              <Text style={[
                styles.resendButton,
                (isResendLoading || resendCooldown > 0) && styles.resendButtonDisabled
              ]}>
                {isResendLoading ? 'Sending...' : 
                 resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleGoBack} disabled={isLoading}>
            <Text style={styles.backButton}>← Change phone number</Text>
          </TouchableOpacity>
          
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>Important:</Text>
            <Text style={styles.securityText}>
              • OTP expires in 10 minutes
              {'\n'}• Enter OTP within {formatTime(otpTimer)}
              {'\n'}• This verifies your device for secure access
              {'\n'}• Rate limit applies for OTP resend
            </Text>
          </View>
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
    lineHeight: 20,
  },
  phoneContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  phoneLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
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
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  verifyButtonText: {
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
    color: '#6B7280',
    marginRight: 4,
  },
  resendButton: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#D1D5DB',
  },
  footer: {
    marginTop: 32,
  },
  backButton: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  securityInfo: {
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

export default VerifyOTPScreen;