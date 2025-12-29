import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import PrayantraLogo from '@/components/PrayantraLogo';

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

// Define country code type
type CountryCode = {
  code: string;
  country: string;
  flag: string;
};

// Country code data
const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
];

const LoginInitiateScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]); // Default to India
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Filter countries based on search query
  const filteredCountries = COUNTRY_CODES.filter(country => 
    country.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters
    const cleaned = input.replace(/\D/g, '');
    
    // Format based on country code
    if (selectedCountry.code === '+1') {
      // US format: (XXX) XXX-XXXX
      const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (match) {
        const part1 = match[1];
        const part2 = match[2];
        const part3 = match[3];
        
        if (part2 && part3) {
          return `(${part1}) ${part2}-${part3}`;
        } else if (part2) {
          return `(${part1}) ${part2}`;
        } else if (part1) {
          return `(${part1}`;
        }
      }
    } else if (selectedCountry.code === '+44') {
      // UK format: XXXX XXX XXX
      const match = cleaned.match(/^(\d{0,4})(\d{0,3})(\d{0,3})$/);
      if (match) {
        const part1 = match[1];
        const part2 = match[2];
        const part3 = match[3];
        
        if (part2 && part3) {
          return `${part1} ${part2} ${part3}`;
        } else if (part2) {
          return `${part1} ${part2}`;
        } else if (part1) {
          return part1;
        }
      }
    } else {
      // Default format: XXX XXX XXXX for 10 digits
      const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (match) {
        const part1 = match[1];
        const part2 = match[2];
        const part3 = match[3];
        
        if (part2 && part3) {
          return `${part1} ${part2} ${part3}`;
        } else if (part2) {
          return `${part1} ${part2}`;
        } else if (part1) {
          return part1;
        }
      }
    }
    
    return cleaned;
  };

  const handlePhoneNumberChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const getPhoneNumberForApi = () => {
    // Remove all non-digit characters and combine with country code
    const cleaned = phoneNumber.replace(/\D/g, '');
    return `${selectedCountry.code}${cleaned}`;
  };

  const handleLoginInitiate = async () => {
    const fullPhoneNumber = getPhoneNumberForApi();
    
    if (!phoneNumber.trim()) {
      showToast('error', 'Please enter your phone number');
      return;
    }
  
    const cleaned = phoneNumber.replace(/\D/g, '');
    const minLength = selectedCountry.code === '+91' ? 10 : 7;
    
    if (cleaned.length < minLength) {
      showToast('error', `Please enter a valid ${selectedCountry.country} phone number`);
      return;
    }
  
    setIsLoading(true);
    try {
      const response = await api.loginInitiate(fullPhoneNumber);
      const { 
        user_exists, 
        has_mpin, 
        mpin_locked, 
        device_trusted,
        user_id,
        flow_state
      } = response.data.data;
      
      console.log('✅ LoginInitiate response:', {
        user_exists,
        has_mpin,
        mpin_locked,
        device_trusted,
        user_id,
        flow_state
      });
  
      if (!user_exists) {
        showToast('error', 'Phone number not registered. Please contact your admin.');
        return;
      }
  
      if (mpin_locked) {
        Alert.alert(
          'MPIN Locked',
          'Your MPIN is locked. Please contact your administrator.',
          [{ text: 'OK' }]
        );
        return;
      }
  
      // ✅ Store phone number temporarily in state, NOT in permanent storage yet
      // We'll store it only after successful MPIN verification
      if (device_trusted && has_mpin) {
        console.log('➡️ Navigating to VerifyMPIN');
        navigation.navigate('VerifyMPIN', {
          phoneNumber: fullPhoneNumber,
          adminId: user_id
        });
      } else if (!device_trusted) {
        console.log('➡️ Navigating to SendOTP');
        navigation.navigate('SendOTP', {
          phoneNumber: fullPhoneNumber,
          adminId: user_id
        });
      } else if (!has_mpin) {
        console.log('➡️ Navigating to SetupMPIN');
        navigation.navigate('SetupMPIN', {
          phoneNumber: fullPhoneNumber,
          adminId: user_id
        });
      }
    } catch (error: any) {
      console.error('❌ LoginInitiate error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      showToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const renderCountryItem = ({ item }: { item: CountryCode }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        selectedCountry.code === item.code && styles.selectedCountryItem
      ]}
      onPress={() => {
        setSelectedCountry(item);
        setShowCountryModal(false);
        setSearchQuery(''); // Clear search when selecting
      }}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <View style={styles.countryInfo}>
        <Text style={[
          styles.countryName,
          selectedCountry.code === item.code && styles.selectedCountryText
        ]}>
          {item.country}
        </Text>
        <Text style={[
          styles.countryCode,
          selectedCountry.code === item.code && styles.selectedCountryText
        ]}>
          {item.code}
        </Text>
      </View>
      {selectedCountry.code === item.code && (
        <Icon name="check" size={20} color="#C084FC" />
      )}
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <ScrollView 
            contentContainerStyle={[
              styles.scrollContent,
              keyboardVisible && styles.scrollContentWithKeyboard
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoContainer}>
              <PrayantraLogo size={keyboardVisible ? 120 : 200} />
              <Text style={styles.appName}>Prayantra</Text>
              {!keyboardVisible && (
                <Text style={styles.tagline}>Empowering Enterprises</Text>
              )}
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.title}>Admin Login</Text>
              <Text style={styles.subtitle}>Enter your phone number to continue</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneInputContainer}>
                  <TouchableOpacity
                    style={styles.countryCodeButton}
                    onPress={() => {
                      dismissKeyboard();
                      setShowCountryModal(true);
                    }}
                  >
                    <Text style={styles.countryCodeText}>{selectedCountry.flag} {selectedCountry.code}</Text>
                    <Icon name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.phoneInput}
                    placeholder={
                      selectedCountry.code === '+1' ? '(123) 456-7890' :
                      selectedCountry.code === '+44' ? '1234 567 890' :
                      '98765 43210'
                    }
                    value={phoneNumber}
                    onChangeText={handlePhoneNumberChange}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    onFocus={() => setKeyboardVisible(true)}
                    onBlur={() => setKeyboardVisible(false)}
                  />
                </View>
                
                <Text style={styles.phonePreview}>
                  Number will be sent as: {getPhoneNumberForApi() || '...'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLoginInitiate}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Checking...' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>

            {!keyboardVisible && (
              <>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoTitle}>Need help?</Text>
                  <Text style={styles.infoText}>
                    • Make sure to enter your registered phone number
                    {'\n'}• Include your country code if you're logging in from abroad
                    {'\n'}• Contact your system administrator for assistance
                  </Text>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>© 2024 Prayantra. All rights reserved.</Text>
                  <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Country Code Selection Modal */}
        <Modal
          visible={showCountryModal}
          animationType="slide"
          transparent={true}
          statusBarTranslucent={true}
          onRequestClose={() => {
            setShowCountryModal(false);
            setSearchQuery(''); // Clear search when closing
          }}
        >
          <TouchableWithoutFeedback onPress={() => setShowCountryModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Country Code</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowCountryModal(false);
                        setSearchQuery('');
                      }}
                      style={styles.closeButton}
                    >
                      <Icon name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.searchContainer}>
                    <Icon name="magnify" size={20} color="#64748B" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search country..."
                      placeholderTextColor="#94A3B8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <FlatList
                    data={filteredCountries}
                    renderItem={renderCountryItem}
                    keyExtractor={(item: CountryCode) => item.code}
                    showsVerticalScrollIndicator={false}
                    style={styles.countryList}
                    keyboardShouldPersistTaps="handled"
                  />

                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => {
                      setShowCountryModal(false);
                      setSearchQuery('');
                    }}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  scrollContentWithKeyboard: {
    paddingTop: 20,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#C084FC',
    marginTop: 16,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    letterSpacing: 1,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    overflow: 'hidden',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRightWidth: 1,
    borderRightColor: '#DDD',
    minWidth: 100,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  phonePreview: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#C084FC',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#D8B4FE',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 24,
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C084FC',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6B21A8',
    lineHeight: 18,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
  versionText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 8,
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedCountryItem: {
    backgroundColor: '#FAF5FF',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 2,
  },
  countryCode: {
    fontSize: 14,
    color: '#64748B',
  },
  selectedCountryText: {
    color: '#C084FC',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#C084FC',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginInitiateScreen;