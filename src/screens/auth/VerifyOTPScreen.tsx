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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import PrayantraLogo from '@/components/PrayantraLogo';
import OTPInput from '@/components/OTPInput';

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

type VerifyOTPScreenRouteProp = RouteProp<RootStackParamList, 'VerifyOTP'>;

const VerifyOTPScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<VerifyOTPScreenRouteProp>();
  const { phoneNumber, adminId } = route.params;
  
  const { login } = useAuth();
  const { showToast } = useToast();

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOTP();
    }
  }, [otp]);

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          Alert.alert(
            'OTP Expired',
            'The OTP has expired. Please request a new one.',
            [{ text: 'OK', onPress: () => navigation.navigate('SendOTP', { phoneNumber, adminId }) }]
          );
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
      const { has_mpin, device_trusted, admin_id, message } = response.data.data;
      
      if (has_mpin) {
        // Navigate to MPIN verification
        showToast('success', message || 'Device verified successfully');
        navigation.navigate('VerifyMPIN', { 
          phoneNumber,
          adminId: admin_id || adminId 
        });
      } else {
        // Navigate to MPIN setup
        showToast('success', 'Device verified. Please setup your MPIN');
        navigation.navigate('SetupMPIN', { 
          phoneNumber,
          adminId: admin_id || adminId 
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'OTP verification failed';
      setError(true);
      setOtp('');
      showToast('error', errorMessage);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const resendOTPMutation = useMutation({
    mutationFn: () => api.sendOTP(phoneNumber, 'admin_login'),
    onSuccess: () => {
      showToast('success', 'OTP resent successfully');
      setTimer(600); // Reset to 10 minutes
      startTimer();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP';
      showToast('error', errorMessage);
    },
  });

  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      showToast('error', 'Please enter 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError(false);
    verifyOTPMutation.mutate(otp);
  };

  const handleResendOTP = () => {
    if (timer > 540) { // Can't resend before 1 minute
      showToast('info', 'Please wait before requesting a new OTP');
      return;
    }
    resendOTPMutation.mutate();
  };

  const handleGoBack = () => {
    navigation.navigate('SendOTP', { phoneNumber, adminId });
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
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP sent to your phone
          </Text>

          <View style={styles.phoneContainer}>
            <Text style={styles.phoneLabel}>Phone Number</Text>
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </View>

          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>Time remaining: {formatTime(timer)}</Text>
          </View>

          <OTPInput
            length={6}
            onComplete={setOtp}
            error={error}
            disabled={isLoading}
            autoFocus={true}
          />

          {error && (
            <Text style={styles.errorText}>
              Invalid OTP. Please try again.
            </Text>
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Verifying OTP...</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={isLoading || otp.length !== 6}
          >
            <Text style={styles.verifyButtonText}>
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              Didn't receive OTP? 
            </Text>
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={resendOTPMutation.isPending || timer > 540}
            >
              <Text style={[
                styles.resendButton,
                (resendOTPMutation.isPending || timer > 540) && styles.resendButtonDisabled
              ]}>
                {resendOTPMutation.isPending ? 'Sending...' : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleGoBack}>
            <Text style={styles.backButton}>← Change phone number</Text>
          </TouchableOpacity>
          
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>Important:</Text>
            <Text style={styles.securityText}>
              • OTP expires in 10 minutes
              {'\n'}• Enter OTP within {formatTime(timer)}
              {'\n'}• This verifies your device for secure access
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
  },
  phoneContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
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
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
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
  verifyButton: {
    backgroundColor: '#C084FC', // Purple
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#D8B4FE', // Light purple
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
  footer: {
    marginTop: 32,
  },
  backButton: {
    color: '#C084FC', // Purple
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  securityInfo: {
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

export default VerifyOTPScreen;