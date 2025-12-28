import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getItem, setItem } from './storage';

// Keychain/Keystore keys
const SECURE_DEVICE_ID_KEY = 'prayantra_persistent_device_id';

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
    // Generate or retrieve device ID
    let deviceId = await SecureStore.getItemAsync(SECURE_DEVICE_ID_KEY);
    
    if (!deviceId) {
      const randomBytes = Crypto.getRandomBytes(32);
      const timestamp = Date.now().toString(36);
      const uniqueString = `${Device.modelName}-${Device.brand}-${Platform.OS}-${timestamp}-${Array.from(randomBytes).join('')}`;
      const deviceHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        uniqueString
      );
      
      deviceId = `prayantra-${Platform.OS}-${deviceHash.substring(0, 16)}`;
      await SecureStore.setItemAsync(SECURE_DEVICE_ID_KEY, deviceId);
    }

    // Generate device fingerprint
    const fingerprintData = {
      device_id: deviceId,
      device_model: Device.modelName || 'Unknown',
      device_brand: Device.brand || 'Unknown',
      platform: Platform.OS,
      os_version: Device.osVersion || 'Unknown',
      is_emulator: !Device.isDevice,
      timestamp: new Date().toISOString()
    };

    const deviceFingerprint = JSON.stringify(fingerprintData);
    const userAgent = generateSecureUserAgent();

    // Check biometric capabilities
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const isBiometricSupported = hasHardware && isEnrolled;
    
    let biometricType = 'none';
    if (isBiometricSupported) {
      const supportedBiometrics = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      } else if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'face_id';
      }
    }

    // Store in AsyncStorage for quick access
    await setItem('device_id', deviceId);
    await setItem('device_fingerprint', deviceFingerprint);
    await setItem('user_agent', userAgent);

    return {
      deviceId,
      deviceFingerprint,
      userAgent,
      biometricType,
      isBiometricSupported,
      secureStorageAvailable: true,
    };
  } catch (error) {
    console.error('Device info generation failed:', error);
    // Fallback
    const fallbackId = `prayantra-${Platform.OS}-${Date.now()}`;
    return {
      deviceId: fallbackId,
      deviceFingerprint: JSON.stringify({ device_id: fallbackId }),
      userAgent: generateSecureUserAgent(),
      biometricType: 'none',
      isBiometricSupported: false,
      secureStorageAvailable: false,
    };
  }
};

export const getStoredDeviceInfo = async (): Promise<DeviceInfo> => {
  try {
    const deviceId = await getItem('device_id') || '';
    const deviceFingerprint = await getItem('device_fingerprint') || '';
    const userAgent = await getItem('user_agent') || generateSecureUserAgent();

    if (!deviceId || !deviceFingerprint) {
      return getDeviceInfo();
    }

    return {
      deviceId,
      deviceFingerprint,
      userAgent,
      biometricType: 'none',
      isBiometricSupported: false,
      secureStorageAvailable: true,
    };
  } catch (error) {
    console.error('Error getting stored device info:', error);
    return getDeviceInfo();
  }
};

export const initializeDeviceInfo = async (): Promise<void> => {
  console.log("🚀 INITIALIZING DEVICE INFORMATION...");
  try {
    await getDeviceInfo();
    console.log("✅ DEVICE INFORMATION INITIALIZED");
  } catch (error) {
    console.error("❌ DEVICE INITIALIZATION FAILED:", error);
  }
};