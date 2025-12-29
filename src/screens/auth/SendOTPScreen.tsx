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
} from 'react-native';
import { useNavigation, NavigationProp, RouteProp, useRoute } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useToast } from '@/components/Toast';
import PrayantraLogo from '@/components/PrayantraLogo';

type RootStackParamList = {
  LoginInitiate: undefined;
  SendOTP: { phoneNumber: string; adminId?: string };
  VerifyOTP: { phoneNumber: string; adminId?: string };
  SetupMPIN: { phoneNumber: string; adminId: string };
  VerifyMPIN: { phoneNumber?: string; adminId?: string };
  ForgotMPIN: { phoneNumber?: string };
  MainDashboard: undefined;
};

type SendOTPScreenRouteProp = RouteProp<RootStackParamList, 'SendOTP'>;

const SendOTPScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<SendOTPScreenRouteProp>();
  const { phoneNumber, adminId } = route.params;
  const { showToast } = useToast();

  const [resendCooldown, setResendCooldown] = useState(0); // Start at 0, will set after first send
  const [isLoading, setIsLoading] = useState(true); // Start loading to auto-send OTP
  const [hasSentInitialOTP, setHasSentInitialOTP] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('📱 SendOTPScreen mounted, auto-sending OTP to:', phoneNumber);
    
    // Auto-send OTP when screen loads
    if (!hasSentInitialOTP) {
      handleSendOTP();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startTimer = (seconds: number = 60) => {
    setResendCooldown(seconds);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
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
      console.log('✅ OTP sent successfully:', response.data);
      showToast('success', 'OTP sent successfully to your phone');
      startTimer(60);
      setHasSentInitialOTP(true);
      setIsLoading(false);
    },
    onError: (error: any) => {
      console.error('❌ OTP send error:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Failed to send OTP';
      
      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retry_after || 60;
        startTimer(retryAfter);
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
      setIsLoading(false);
    },
  });

  const handleSendOTP = () => {
    if (resendCooldown > 0 && !isLoading) {
      showToast('info', `Please wait ${resendCooldown} seconds before resending`);
      return;
    }
    setIsLoading(true);
    console.log('📡 Sending OTP to:', phoneNumber);
    sendOTPMutation.mutate();
  };

  const handleVerifyOTP = () => {
    console.log('➡️ Navigating to VerifyOTP with phone:', phoneNumber);
    navigation.navigate('VerifyOTP', { phoneNumber, adminId });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <PrayantraLogo size={100} />
          <Text style={styles.appName}>Prayantra</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Verify Device</Text>
          <Text style={styles.subtitle}>
            {isLoading ? 'Sending OTP...' : 'We\'ve sent a 6-digit OTP to your registered phone number'}
          </Text>

          <View style={styles.phoneContainer}>
            <Text style={styles.phoneLabel}>Phone Number</Text>
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </View>

          <Text style={styles.instruction}>
            For security reasons, we need to verify this device. Enter the OTP sent to your phone.
          </Text>

          <TouchableOpacity
            style={[styles.verifyButton, (!hasSentInitialOTP || isLoading) && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={!hasSentInitialOTP || isLoading}
          >
            <Text style={styles.verifyButtonText}>
              {!hasSentInitialOTP ? 'Sending OTP...' : 'Enter OTP'}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              Didn't receive OTP? 
            </Text>
            <TouchableOpacity
              onPress={handleSendOTP}
              disabled={isLoading || resendCooldown > 0}
            >
              <Text style={[
                styles.resendButton,
                (isLoading || resendCooldown > 0) && styles.resendButtonDisabled
              ]}>
                {isLoading ? 'Sending...' : 
                 resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
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
    color: '#C084FC',
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
    backgroundColor: '#C084FC',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#D8B4FE',
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
    color: '#C084FC',
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#D8B4FE',
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
    color: '#C084FC',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  securityInfo: {
    backgroundColor: '#FAF5FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C084FC',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#6B21A8',
    lineHeight: 18,
  },
});

export default SendOTPScreen;