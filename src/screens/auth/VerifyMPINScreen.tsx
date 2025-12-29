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
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import PrayantraLogo from '@/components/PrayantraLogo';
import MPINInput, { MPINInputRef } from '@/components/MPINInput';
import {
  hasStoredPhoneNumber,
  getFormattedPhoneNumber,
  getDisplayPhoneNumber
} from '@/services/storage';

const { height } = Dimensions.get('window');

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
  
  const { login, clearPhoneNumber } = useAuth();
  const { showToast } = useToast();
  
  const [mpin, setMpin] = useState('');
  const [error, setError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPhone, setIsLoadingPhone] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const mpinInputRef = useRef<MPINInputRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const loadPhoneNumber = async () => {
      setIsLoadingPhone(true);
      try {
        console.log('📱 [VERIFY_MPIN] Loading phone number from params:', params);
        
        // FIRST: Check if we have phone number from params (coming from LoginInitiate)
        if (params?.phoneNumber) {
          setPhoneNumber(params.phoneNumber);
          setDisplayPhoneNumber(formatPhoneForDisplay(params.phoneNumber));
          console.log('✅ [VERIFY_MPIN] Using phone number from params:', params.phoneNumber);
          setIsLoadingPhone(false);
          return;
        }
        
        // SECOND: If no params, check if we have stored phone number
        console.log('🔍 [VERIFY_MPIN] No params, checking stored phone number...');
        const hasPhone = await hasStoredPhoneNumber();
        const formattedPhone = await getFormattedPhoneNumber();
        const displayPhone = await getDisplayPhoneNumber();
        
        console.log('📱 [VERIFY_MPIN] Storage check:', {
          hasPhone,
          formattedPhone,
          displayPhone
        });
        
        if (hasPhone && formattedPhone) {
          setPhoneNumber(formattedPhone);
          setDisplayPhoneNumber(displayPhone || formattedPhone);
          console.log('✅ [VERIFY_MPIN] Using stored phone number:', formattedPhone);
        } else {
          console.log('❌ [VERIFY_MPIN] No phone number found, redirecting to LoginInitiate');
          showToast('info', 'Please login with your phone number');
          navigation.reset({
            index: 0,
            routes: [{ name: 'LoginInitiate' }],
          });
        }
      } catch (error) {
        console.error('❌ [VERIFY_MPIN] Error loading phone number:', error);
        showToast('error', 'Error loading phone number');
        navigation.reset({
          index: 0,
          routes: [{ name: 'LoginInitiate' }],
        });
      } finally {
        setIsLoadingPhone(false);
      }
    };
    
    loadPhoneNumber();

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
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
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

  // Helper function to format phone number for display
  const formatPhoneForDisplay = (phone: string) => {
    if (!phone) return '';
    // If phone is in format +919876543210, format to +91 98765 43210
    const countryCode = phone.substring(0, 3);
    const remaining = phone.substring(3);
    if (remaining.length === 10) {
      return `${countryCode} ${remaining.substring(0, 5)} ${remaining.substring(5)}`;
    }
    return phone;
  };

  const mutation = useMutation({
    mutationFn: (mpin: string) => api.verifyMPIN(phoneNumber, mpin),
    onSuccess: (response: any) => {
      console.log('✅ MPIN verification response:', response.data);
      if (response.data.success) {
        const { admin, tokens, message } = response.data.data;
        console.log('🔐 Tokens received:', {
          accessTokenLength: tokens?.access_token?.length || 0,
          refreshTokenLength: tokens?.refresh_token?.length || 0,
          adminId: admin?.admin_id
        });
        
        if (!tokens?.access_token || !tokens?.refresh_token) {
          console.error('❌ Tokens missing in response:', response.data);
          setError('Invalid response from server. Please try again.');
          showToast('error', 'Invalid server response');
          return;
        }
        
        // ✅ Store phone number ONLY after successful MPIN verification
        // The login function in AuthContext will handle storage
        login(phoneNumber, tokens, admin);
        showToast('success', message || 'Login successful');
        
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainDrawer' }],
        });
      } else {
        const errorMessage = response.data.message || 'MPIN verification failed';
        setError(errorMessage);
        showToast('error', errorMessage);
        setMpin('');
        mpinInputRef.current?.clearAll();
      }
    },
    onError: (error: any) => {
      console.error('❌ MPIN verification error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      const errorType = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || 'MPIN verification failed';
      
      if (errorType === 'MPIN rate limit exceeded') {
        setIsLocked(true);
        setLockTime(60);
        setError('Too many failed attempts. Please try again after 60 seconds.');
        Alert.alert(
          'MPIN Locked',
          'Too many failed attempts. Please try again after 60 seconds.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      
      if (newAttemptCount >= 3) {
        setError(`Invalid MPIN. You have ${5 - newAttemptCount} attempts left.`);
      } else {
        setError('Invalid MPIN. Please try again.');
      }
      
      showToast('error', errorMessage);
      setMpin('');
      mpinInputRef.current?.clearAll();
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleMPINSubmit = (enteredMpin: string) => {
    if (isLocked) {
      setError(`Please wait ${lockTime} seconds before trying again`);
      showToast('error', `Please wait ${lockTime} seconds before trying again`);
      return;
    }
    
    if (enteredMpin.length !== 6) {
      setError('Please enter 6-digit MPIN');
      return;
    }
    
    setMpin(enteredMpin);
    setError('');
    setIsLoading(true);
    mutation.mutate(enteredMpin);
  };

  const handleForgotMPIN = () => {
    navigation.navigate('ForgotMPIN', { phoneNumber });
  };

  const handleRemovePhoneNumber = async () => {
    Alert.alert(
      'Remove Phone Number',
      'Are you sure you want to remove this phone number? You will need to enter it again next time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            await clearPhoneNumber();
            showToast('success', 'Phone number removed');
            navigation.reset({
              index: 0,
              routes: [{ name: 'LoginInitiate' }],
            });
          }
        }
      ]
    );
  };

  const handleUseDifferentAccount = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginInitiate' }],
    });
  };

  if (isLoadingPhone) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
          <Text style={styles.title}>Enter MPIN</Text>
          <Text style={styles.subtitle}>
            {displayPhoneNumber ? `Enter MPIN for ${displayPhoneNumber}` : 'Enter your 6-digit MPIN'}
          </Text>

          <MPINInput
            ref={mpinInputRef}
            onComplete={setMpin}
            onSubmit={handleMPINSubmit}
            error={!!error}
            disabled={isLoading || isLocked}
            showSubmitButton={true}
          />

          {isLocked ? (
            <View style={styles.lockContainer}>
              <Text style={styles.lockText}>
                MPIN locked. Try again in {lockTime} seconds
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Verifying MPIN...</Text>
            </View>
          ) : null}

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleForgotMPIN}
              disabled={isLoading}
            >
              <Text style={styles.actionText}>Forgot MPIN?</Text>
            </TouchableOpacity>

            {!params?.phoneNumber && ( // Only show remove button if using stored number
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRemovePhoneNumber}
                disabled={isLoading}
              >
                <Text style={styles.actionText}>Remove Number</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleUseDifferentAccount}
              disabled={isLoading}
            >
              <Text style={styles.actionText}>Use different account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.securityInfo}>
          <Text style={styles.securityTitle}>Security Tips:</Text>
          <Text style={styles.securityTip}>• Never share your MPIN with anyone</Text>
          <Text style={styles.securityTip}>• Change your MPIN regularly</Text>
          <Text style={styles.securityTip}>• Use a unique MPIN not used elsewhere</Text>
          <Text style={styles.securityTip}>• Your phone number is stored for auto-login</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
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
    marginBottom: 24,
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
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  actionText: {
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
  securityTip: {
    fontSize: 12,
    color: '#6D28D9',
    marginBottom: 4,
  },
});

export default VerifyMPINScreen;