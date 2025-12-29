import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getItem, setItem } from './storage';

// Keychain/Keystore keys
const SECURE_DEVICE_ID_KEY = 'prayantra_persistent_device_id';
const SECURE_DEVICE_FINGERPRINT_KEY = 'prayantra_persistent_device_fingerprint';

export interface DeviceInfo {
  deviceId: string;
  deviceFingerprint: string;
  userAgent: string;
  biometricType: string;
  isBiometricSupported: boolean;
  secureStorageAvailable: boolean;
}

const generateSecureUserAgent = (): string => {
  const appName = 'Prayantra';
  const appVersion = '1.0';
  const platform = Platform.OS;
  
  if (platform === 'ios') {
    return `${appName}/${appVersion} (iOS)`;
  } else if (platform === 'android') {
    return `${appName}/${appVersion} (Android)`;
  } else {
    return `${appName}/${appVersion} (${platform})`;
  }
};

export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  try {
    // Generate or retrieve device ID from SecureStore
    let deviceId = await SecureStore.getItemAsync(SECURE_DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Create a STATIC device ID that doesn't change
      const deviceType = await Device.getDeviceTypeAsync();
      const osVersion = Device.osVersion || 'Unknown';
      const deviceModel = Device.modelName || 'Unknown';
      const deviceBrand = Device.brand || 'Unknown';
      
      // Create a deterministic hash from static device properties
      const staticString = `${deviceModel}-${deviceBrand}-${Platform.OS}-${osVersion}-${deviceType}`;
      const deviceHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        staticString
      );
      
      // Use first 24 chars for device ID (makes it stable)
      deviceId = `prayantra-${Platform.OS}-${deviceHash.substring(0, 24)}`;
      await SecureStore.setItemAsync(SECURE_DEVICE_ID_KEY, deviceId);
      console.log('🆕 [DEVICE] Generated NEW static device ID:', deviceId);
    } else {
      console.log('✅ [DEVICE] Using existing device ID:', deviceId);
    }

    // Generate or retrieve device fingerprint from SecureStore
    let deviceFingerprint = await SecureStore.getItemAsync(SECURE_DEVICE_FINGERPRINT_KEY);
    
    if (!deviceFingerprint) {
      // Create a STATIC fingerprint without timestamp
      const fingerprintData = {
        device_id: deviceId,
        device_model: Device.modelName || 'Unknown',
        device_brand: Device.brand || 'Unknown',
        platform: Platform.OS,
        os_version: Device.osVersion || 'Unknown',
        device_type: await Device.getDeviceTypeAsync(),
        is_emulator: !Device.isDevice,
        // Static properties only - NO timestamp
        app_version: '1.0.0',
        app_build: '1'
      };

      deviceFingerprint = JSON.stringify(fingerprintData);
      await SecureStore.setItemAsync(SECURE_DEVICE_FINGERPRINT_KEY, deviceFingerprint);
      console.log('🆕 [DEVICE] Generated NEW static device fingerprint');
    } else {
      console.log('✅ [DEVICE] Using existing device fingerprint');
    }

    const userAgent = generateSecureUserAgent();

    // Store in AsyncStorage for quick access
    await setItem('device_id', deviceId);
    await setItem('device_fingerprint', deviceFingerprint);
    await setItem('user_agent', userAgent);

    return {
      deviceId,
      deviceFingerprint,
      userAgent,
      biometricType: 'none',
      isBiometricSupported: false,
      secureStorageAvailable: true,
    };
  } catch (error) {
    console.error('❌ [DEVICE] Device info generation failed:', error);
    
    // Static fallback
    const fallbackId = `prayantra-${Platform.OS}-static-fallback`;
    const fallbackFingerprint = JSON.stringify({ 
      device_id: fallbackId,
      platform: Platform.OS,
      is_fallback: true 
    });
    
    return {
      deviceId: fallbackId,
      deviceFingerprint: fallbackFingerprint,
      userAgent: generateSecureUserAgent(),
      biometricType: 'none',
      isBiometricSupported: false,
      secureStorageAvailable: false,
    };
  }
};

export const getStoredDeviceInfo = async (): Promise<DeviceInfo> => {
  try {
    // FIRST: Check SecureStore (primary source of truth)
    let deviceId = await SecureStore.getItemAsync(SECURE_DEVICE_ID_KEY);
    let deviceFingerprint = await SecureStore.getItemAsync(SECURE_DEVICE_FINGERPRINT_KEY);
    
    // SECOND: If not in SecureStore, check AsyncStorage (fallback cache)
    if (!deviceId || !deviceFingerprint) {
      console.log('🔄 [DEVICE] No device info in SecureStore, checking AsyncStorage...');
      deviceId = await getItem('device_id') || '';
      deviceFingerprint = await getItem('device_fingerprint') || '';
    }
    
    // THIRD: If still not found, generate NEW device info
    if (!deviceId || !deviceFingerprint) {
      console.log('🆕 [DEVICE] No stored device info found, generating new...');
      const newDeviceInfo = await getDeviceInfo();
      
      // Return the newly generated info
      return newDeviceInfo;
    }

    console.log('✅ [DEVICE] Using stored device info');
    
    const userAgent = await getItem('user_agent') || generateSecureUserAgent();
    
    return {
      deviceId,
      deviceFingerprint,
      userAgent,
      biometricType: 'none',
      isBiometricSupported: false,
      secureStorageAvailable: true,
    };
  } catch (error) {
    console.error('❌ [DEVICE] Error getting stored device info:', error);
    return getDeviceInfo();
  }
};

export const initializeDeviceInfo = async (): Promise<void> => {
  console.log("🚀 INITIALIZING DEVICE INFORMATION...");
  try {
    const deviceInfo = await getDeviceInfo();
    console.log("✅ DEVICE INFORMATION INITIALIZED:", {
      deviceId: deviceInfo.deviceId,
      fingerprintLength: deviceInfo.deviceFingerprint.length,
      userAgent: deviceInfo.userAgent
    });
  } catch (error) {
    console.error("❌ DEVICE INITIALIZATION FAILED:", error);
  }
};

// Debug helper function to check current device info
export const debugDeviceInfo = async (): Promise<void> => {
  console.log('🔍 [DEVICE DEBUG] Current device info:');
  
  const secureId = await SecureStore.getItemAsync(SECURE_DEVICE_ID_KEY);
  const secureFp = await SecureStore.getItemAsync(SECURE_DEVICE_FINGERPRINT_KEY);
  const asyncId = await getItem('device_id');
  const asyncFp = await getItem('device_fingerprint');
  
  console.log('SecureStore Device ID:', secureId);
  console.log('SecureStore Fingerprint:', secureFp?.substring(0, 100) + '...');
  console.log('AsyncStorage Device ID:', asyncId);
  console.log('AsyncStorage Fingerprint:', asyncFp?.substring(0, 100) + '...');
  
  // Get current device info
  const currentInfo = await getStoredDeviceInfo();
  console.log('Current Device Info:', {
    deviceId: currentInfo.deviceId,
    fingerprintPreview: currentInfo.deviceFingerprint.substring(0, 100) + '...',
    userAgent: currentInfo.userAgent
  });
};

// Reset device info (only for testing or troubleshooting)
export const resetDeviceInfo = async (): Promise<void> => {
  try {
    console.log("🔄 [DEVICE] Resetting device info...");
    await SecureStore.deleteItemAsync(SECURE_DEVICE_ID_KEY);
    await SecureStore.deleteItemAsync(SECURE_DEVICE_FINGERPRINT_KEY);
    await getDeviceInfo(); // This will generate new ones
    console.log("✅ [DEVICE] Device info reset complete");
  } catch (error) {
    console.error("❌ [DEVICE] Error resetting device info:", error);
  }
};