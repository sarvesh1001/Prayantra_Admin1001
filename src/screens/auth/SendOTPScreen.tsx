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
import { STORAGE_KEYS } from '@/services/storage';

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

type SendOTPScreenRouteProp = RouteProp<RootStackParamList, 'SendOTP'>;

const SendOTPScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<SendOTPScreenRouteProp>();
  const { phoneNumber, adminId } = route.params;
  const { showToast } = useToast();

  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
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

  const sendOTPMutation = useMutation({
    mutationFn: () => api.sendOTP(phoneNumber, 'admin_login'),
    onSuccess: (response) => {
      showToast('success', 'OTP sent successfully to your phone');
      startTimer(); // Reset timer after successful send
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to send OTP';
      
      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retry_after || 30;
        setTimer(retryAfter);
        setCanResend(false);
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
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSendOTP = () => {
    if (!canResend && timer > 0) {
      showToast('info', `Please wait ${timer} seconds before resending`);
      return;
    }
    setIsLoading(true);
    sendOTPMutation.mutate();
  };

  const handleVerifyOTP = () => {
    navigation.navigate('VerifyOTP', { phoneNumber, adminId });
  };

  const handleGoBack = () => {
    navigation.goBack();
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
          <Text style={styles.title}>Verify Device</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit OTP to your registered phone number
          </Text>

          <View style={styles.phoneContainer}>
            <Text style={styles.phoneLabel}>Phone Number</Text>
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </View>

          <Text style={styles.instruction}>
            For security reasons, we need to verify this device. Enter the OTP sent to your phone.
          </Text>

          <TouchableOpacity
            style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={isLoading}
          >
            <Text style={styles.verifyButtonText}>Enter OTP</Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              Didn't receive OTP? 
            </Text>
            <TouchableOpacity
              onPress={handleSendOTP}
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

          {sendOTPMutation.isError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {sendOTPMutation.error?.response?.data?.error || 'Failed to send OTP'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleGoBack}>
            <Text style={styles.backButton}>← Back to Login</Text>
          </TouchableOpacity>
          
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>Security Notice:</Text>
            <Text style={styles.securityText}>
              • OTP is valid for 10 minutes
              {'\n'}• Never share OTP with anyone
              {'\n'}• This OTP is for device verification only
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
    color: '#1565C0',
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
  verifyButton: {
    backgroundColor: '#1565C0',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
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
    color: '#1565C0',
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#94A3B8',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
  },
  backButton: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  securityInfo: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
});

export default SendOTPScreen;