import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Regular storage for non-sensitive data
export const setItem = async (key: string, value: string): Promise<void> => {
  try {
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

// Clear only session data, keep phone number and device info
export const clearSessionData = async (): Promise<void> => {
  try {
    const keys = [
      'access_token',
      'refresh_token',
      'admin_info',
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
      'access_token',
      'refresh_token',
      'admin_id',
      'admin_info',
      'phone_number',
      'country_code',
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
    const phoneNumber = await getItem('phone_number');
    const adminId = await getItem('admin_id');
    return !!(phoneNumber && adminId);
  } catch (error) {
    return false;
  }
};

// Get formatted phone number with country code
export const getFormattedPhoneNumber = async (): Promise<string | null> => {
  try {
    const phoneNumber = await getItem('phone_number');
    const countryCode = await getItem('country_code') || '+91';
    
    if (phoneNumber) {
      return `${countryCode}${phoneNumber}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Add these constants at the top
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  ADMIN_ID: 'admin_id',
  ADMIN_INFO: 'admin_info',
  PHONE_NUMBER: 'phone_number',
  COUNTRY_CODE: 'country_code',
  DEVICE_ID: 'device_id',
  USER_AGENT: 'user_agent',
  IS_FIRST_LAUNCH: 'is_first_launch',
  ROLE_MASK: 'role_mask',
  PERMISSION_MASK: 'permission_mask',
};

// Add this helper function
export const getAdminRole = async (): Promise<number> => {
  try {
    const adminInfoStr = await getItem('admin_info');
    if (adminInfoStr) {
      const adminInfo = JSON.parse(adminInfoStr);
      return adminInfo.role_mask || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting admin role:', error);
    return 0;
  }
};