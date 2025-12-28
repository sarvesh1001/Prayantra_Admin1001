import React, { useState, useEffect } from 'react';
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
import { useNavigation, NavigationProp, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import PrayantraLogo from '@/components/PrayantraLogo';
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

type VerifyMPINScreenRouteProp = RouteProp<RootStackParamList, 'VerifyMPIN'>;

const VerifyMPINScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<VerifyMPINScreenRouteProp>();
  const params = route.params;
  
  const { login } = useAuth();
  const { showToast } = useToast();
  
  const [mpin, setMpin] = useState('');
  const [error, setError] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');

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
    if (isLocked && lockTime > 0) {
      const timer = setInterval(() => {
        setLockTime(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLocked, lockTime]);

  const mutation = useMutation({
    mutationFn: (mpin: string) => api.verifyMPIN(phoneNumber, mpin),
    onSuccess: (response: any) => {
      const { admin, tokens, message } = response.data.data;
      
      // Login success
      login(phoneNumber, tokens, admin);
      
      showToast('success', message || 'Login successful');
    },
    onError: (error: any) => {
      const errorType = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || 'MPIN verification failed';
      
      if (errorType === 'MPIN rate limit exceeded') {
        setIsLocked(true);
        setLockTime(60);
        Alert.alert(
          'MPIN Locked',
          'Too many failed attempts. Please try again after 60 seconds.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setError(true);
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      
      if (newAttemptCount >= 3) {
        Alert.alert(
          'Warning',
          `You have ${5 - newAttemptCount} attempts left before temporary lock.`,
          [{ text: 'OK' }]
        );
      }
      
      showToast('error', errorMessage);
      
      // Clear MPIN after error
      setMpin('');
    },
  });

  const handleMPINComplete = (enteredMpin: string) => {
    if (isLocked) {
      showToast('error', `Please wait ${lockTime} seconds before trying again`);
      return;
    }
    
    setMpin(enteredMpin);
    setError(false);
    mutation.mutate(enteredMpin);
  };

  const handleForgotMPIN = () => {
    navigation.navigate('ForgotMPIN', { phoneNumber });
  };

  const handleUseDifferentAccount = () => {
    navigation.navigate('LoginInitiate');
  };

  const isPending = mutation.isPending;

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
          <Text style={styles.title}>Enter MPIN</Text>
          <Text style={styles.subtitle}>
            {phoneNumber ? `Logged in as ${phoneNumber}` : 'Enter your 6-digit MPIN'}
          </Text>

          <MPINInput
            onComplete={handleMPINComplete}
            error={error}
            disabled={isPending || isLocked}
          />

          {isLocked && (
            <View style={styles.lockContainer}>
              <Text style={styles.lockText}>
                MPIN locked. Try again in {lockTime} seconds
              </Text>
            </View>
          )}

          {isPending && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Verifying MPIN...</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={handleForgotMPIN}
            disabled={isPending}
          >
            <Text style={styles.forgotText}>Forgot MPIN?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.differentAccountButton}
            onPress={handleUseDifferentAccount}
            disabled={isPending}
          >
            <Text style={styles.differentAccountText}>Use different account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityInfo}>
          <Text style={styles.securityTitle}>Security Tips:</Text>
          <Text style={styles.securityTip}>• Never share your MPIN with anyone</Text>
          <Text style={styles.securityTip}>• Change your MPIN regularly</Text>
          <Text style={styles.securityTip}>• Use a unique MPIN not used elsewhere</Text>
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
    marginBottom: 32,
    textAlign: 'center',
  },
  lockContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  lockText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    marginTop: 16,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  forgotButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  forgotText: {
    color: '#C084FC', // Purple
    fontSize: 14,
    fontWeight: '500',
  },
  differentAccountButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  differentAccountText: {
    color: '#64748B',
    fontSize: 14,
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
  securityTip: {
    fontSize: 12,
    color: '#6B21A8',
    marginBottom: 4,
  },
});

export default VerifyMPINScreen;