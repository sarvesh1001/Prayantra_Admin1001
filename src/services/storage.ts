import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Regular storage for non-sensitive data
export const setItem = async (key: string, value: string): Promise<void> => {
  try {
    if (value === undefined || value === null) {
      console.warn(`Attempting to store null/undefined value for key: ${key}`);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error('Error storing data:', error);
  }
};

export const getItem = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('Error retrieving data:', error);
    return null;
  }
};

export const removeItem = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing data:', error);
  }
};

// Clear only session data (tokens and admin info), keep phone number
export const clearSessionData = async (): Promise<void> => {
  try {
    const keys = [
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.ADMIN_INFO,
    ];
    
    await AsyncStorage.multiRemove(keys);
    console.log("✅ SESSION DATA CLEARED, PHONE NUMBER & ADMIN ID PRESERVED");
  } catch (error) {
    console.error('Error clearing session data:', error);
  }
};

// Clear everything including phone number and admin ID
export const clearAllUserData = async (): Promise<void> => {
  try {
    const keys = [
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.ADMIN_ID,
      STORAGE_KEYS.ADMIN_INFO,
      STORAGE_KEYS.PHONE_NUMBER,
    ];

    await AsyncStorage.multiRemove(keys);
    console.log("✅ ALL USER DATA CLEARED");
  } catch (error) {
    console.error('Error clearing all user data:', error);
  }
};

// Clear everything including device info (only for app uninstall scenarios)
export const clearAllStorage = async (): Promise<void> => {
  try {
    // Clear all AsyncStorage
    await AsyncStorage.clear();
    
    // Clear all SecureStore
    await SecureStore.deleteItemAsync('persistent_device_id');
    await SecureStore.deleteItemAsync('installation_id');
    
    console.log("✅ COMPLETE STORAGE CLEARED INCLUDING DEVICE INFO");
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};

// Helper to check if user has stored phone number
export const hasStoredPhoneNumber = async (): Promise<boolean> => {
  try {
    const phoneNumber = await getItem(STORAGE_KEYS.PHONE_NUMBER);
    const adminId = await getItem(STORAGE_KEYS.ADMIN_ID);
    return !!(phoneNumber && adminId);
  } catch (error) {
    return false;
  }
};

// Get formatted phone number (stored as +919876543210 format)
export const getFormattedPhoneNumber = async (): Promise<string | null> => {
  try {
    const phoneNumber = await getItem(STORAGE_KEYS.PHONE_NUMBER);
    // Return phone number as stored (format: +919876543210)
    return phoneNumber;
  } catch (error) {
    return null;
  }
};

// Get phone number with spaces for display
export const getDisplayPhoneNumber = async (): Promise<string | null> => {
  try {
    const phoneNumber = await getItem(STORAGE_KEYS.PHONE_NUMBER);
    if (!phoneNumber) return null;
    
    // Format: +91 98765 43210
    const countryCode = phoneNumber.substring(0, 3); // +91
    const remaining = phoneNumber.substring(3);
    
    if (remaining.length === 10) {
      return `${countryCode} ${remaining.substring(0, 5)} ${remaining.substring(5)}`;
    }
    
    return phoneNumber;
  } catch (error) {
    return null;
  }
};

// Store phone number permanently (for auto-login feature)
export const storePhoneNumberPermanently = async (phoneNumber: string, adminId: string): Promise<void> => {
  try {
    // Remove all spaces and store in format: +919876543210
    const formattedPhone = phoneNumber.replace(/\s/g, '');
    
    console.log('🔐 [STORAGE] Storing phone number permanently:', {
      original: phoneNumber,
      formatted: formattedPhone,
      adminId
    });
    
    await setItem(STORAGE_KEYS.PHONE_NUMBER, formattedPhone);
    await setItem(STORAGE_KEYS.ADMIN_ID, adminId);
    
    console.log('✅ [STORAGE] Phone number stored permanently');
  } catch (error) {
    console.error('❌ [STORAGE] Error storing phone number:', error);
    throw error;
  }
};

// Remove phone number permanently (when user explicitly removes it)
export const removePhoneNumberPermanently = async (): Promise<void> => {
  try {
    console.log('🔐 [STORAGE] Removing phone number permanently');
    await removeItem(STORAGE_KEYS.PHONE_NUMBER);
    await removeItem(STORAGE_KEYS.ADMIN_ID);
    console.log('✅ [STORAGE] Phone number removed permanently');
  } catch (error) {
    console.error('❌ [STORAGE] Error removing phone number:', error);
    throw error;
  }
};

// Storage keys based on your API responses
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  ADMIN_ID: 'admin_id',
  ADMIN_INFO: 'admin_info',
  PHONE_NUMBER: 'phone_number', // Store as +919876543210 format
  DEVICE_ID: 'device_id',
  USER_AGENT: 'user_agent',
  DEVICE_FINGERPRINT: 'device_fingerprint',
};