import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdminInfo, AuthTokens, LoginFlowState, ApiError } from '@/types';
import { api } from '@/services/api';
import { 
  getItem, 
  setItem, 
  removeItem, 
  STORAGE_KEYS,
  hasStoredPhoneNumber,
  getFormattedPhoneNumber,
  storePhoneNumberPermanently,
  removePhoneNumberPermanently,
  clearSessionData
} from '@/services/storage';
import { getStoredDeviceInfo } from '@/services/deviceInfo';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  adminInfo: AdminInfo | null;
  tokens: AuthTokens | null;
  phoneNumber: string | null;
  adminId: string | null;
  loginFlow: LoginFlowState | null;
  login: (phone: string, tokens: AuthTokens, adminInfo: AdminInfo) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  updateAdminInfo: (info: Partial<AdminInfo>) => void;
  checkExistingSession: () => Promise<void>;
  storePhoneNumber: (phone: string, adminId?: string) => Promise<void>;
  clearPhoneNumber: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  clearTokensAndNavigate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [loginFlow, setLoginFlow] = useState<LoginFlowState | null>(null);
  const queryClient = useQueryClient();

  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 [AUTH] Validating session...');
      
      // First check if we have an access token
      const accessToken = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
      console.log('🔐 [AUTH] Access token check:', {
        hasToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        tokenPreview: accessToken ? `${accessToken.substring(0, 30)}...` : 'NONE'
      });
      
      if (!accessToken) {
        console.log('❌ [AUTH] No access token found for validation');
        return false;
      }

      // Decode JWT to check expiration
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        console.log('⏰ [AUTH] Token expiry check:', {
          expiryTime: new Date(exp).toISOString(),
          currentTime: new Date(now).toISOString(),
          expiresIn: Math.floor((exp - now) / 1000) + ' seconds',
          isExpired: now >= exp
        });
        
        if (now >= exp) {
          console.log('❌ [AUTH] Token has expired');
          return false;
        }
      } catch (decodeError) {
        console.warn('⚠️ [AUTH] Could not decode token:', decodeError);
      }

      console.log('📡 [AUTH] Calling validateSession API...');
      const response = await api.validateSession();
      console.log('✅ [AUTH] Session validation response:', response.data);
      
      const { valid } = response.data.data;
      console.log('✅ [AUTH] Session validation result:', valid);
      return valid;
    } catch (error: any) {
      console.error('❌ [AUTH] Session validation error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        headers: error.config?.headers
      });
      return false;
    }
  }, []);

  const storePhoneNumber = useCallback(async (phone: string, adminId?: string) => {
    try {
      console.log('🔐 [AUTH] Storing phone number:', phone, 'adminId:', adminId);
      
      // Store full phone number without spaces in format +919876543210
      const formattedPhone = phone.replace(/\s/g, '');
      
      if (adminId) {
        // Store phone number PERMANENTLY for auto-login feature
        await storePhoneNumberPermanently(formattedPhone, adminId);
        setAdminId(adminId);
      } else {
        // Just store phone number temporarily
        await setItem(STORAGE_KEYS.PHONE_NUMBER, formattedPhone);
      }
      
      setPhoneNumber(formattedPhone);
      console.log('✅ [AUTH] Phone number stored successfully:', formattedPhone);
    } catch (error) {
      console.error('❌ [AUTH] Error storing phone number:', error);
    }
  }, []);

  const clearPhoneNumber = useCallback(async () => {
    try {
      await removePhoneNumberPermanently();
      setPhoneNumber(null);
      setAdminId(null);
      console.log('✅ [AUTH] Phone number cleared permanently');
    } catch (error) {
      console.error('❌ [AUTH] Error clearing phone number:', error);
    }
  }, []);

  const clearTokensAndNavigate = useCallback(async () => {
    console.log('🔐 [AUTH] Clearing tokens for session validation failure...');
    
    try {
      // Clear only tokens, keep phone number and admin ID for VerifyMPIN
      await clearSessionData();
      
      queryClient.clear();
      
      // Reset auth state but keep phone number for VerifyMPIN
      setIsAuthenticated(false);
      setAdminInfo(null);
      setTokens(null);
      setLoginFlow(null);
      
      console.log('✅ [AUTH] Tokens cleared, phone number preserved for VerifyMPIN');
    } catch (error) {
      console.error('❌ [AUTH] Error clearing tokens:', error);
    }
  }, [queryClient]);

  const initializeAuth = useCallback(async () => {
    try {
      console.log('🔄 [AUTH] Initializing authentication...');
      setIsInitializing(true);
      setIsLoading(true);
      
      // Clear ALL tokens on app start - don't validate old sessions
      console.log('🧹 [AUTH] Clearing all tokens on app start...');
      await clearSessionData();
      
      // Check if we have stored phone number PERMANENTLY
      const hasPhone = await hasStoredPhoneNumber();
      const formattedPhone = await getFormattedPhoneNumber();
      
      console.log('📱 [AUTH] Stored phone check:', { 
        hasPhone, 
        formattedPhone,
        phoneNumber: await getItem(STORAGE_KEYS.PHONE_NUMBER),
        adminId: await getItem(STORAGE_KEYS.ADMIN_ID)
      });
      
      if (hasPhone && formattedPhone) {
        setPhoneNumber(formattedPhone);
        
        const storedAdminId = await getItem(STORAGE_KEYS.ADMIN_ID);
        if (storedAdminId) {
          setAdminId(storedAdminId);
        }
        
        console.log('✅ [AUTH] Phone number found, NOT authenticated - will go to VerifyMPIN');
        setIsAuthenticated(false);
      } else {
        // No phone number stored
        console.log('❌ [AUTH] No phone number stored in permanent storage');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ [AUTH] Auth initialization error:', error);
      setIsAuthenticated(false);
    } finally {
      console.log('✅ [AUTH] Auth initialization complete');
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 [AUTH] AuthProvider mounted, initializing auth...');
    initializeAuth();
  }, [initializeAuth]);

  const startTokenRefresh = useCallback(() => {
    console.log('🔄 [AUTH] Starting token refresh interval');
    const refreshInterval = setInterval(async () => {
      try {
        console.log('🔄 [AUTH] Refreshing token...');
        const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const response = await api.refreshToken(refreshToken);
          const newTokens = response.data;
          
          if (newTokens?.access_token) {
            await setItem(STORAGE_KEYS.ACCESS_TOKEN, newTokens.access_token);
          }
          if (newTokens?.refresh_token) {
            await setItem(STORAGE_KEYS.REFRESH_TOKEN, newTokens.refresh_token);
          }
          
          setTokens(newTokens);
          console.log('✅ [AUTH] Token refreshed successfully');
        }
      } catch (error) {
        console.error('❌ [AUTH] Token refresh failed:', error);
      }
    }, 4.5 * 60 * 1000); // Refresh every 4.5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const login = useCallback(async (
    phone: string, 
    tokensData: AuthTokens, 
    adminInfoData: AdminInfo
  ) => {
    try {
      console.log('🔐 [AUTH] Login attempt for phone:', phone);
      
      // Validate tokens before storing
      if (!tokensData?.access_token || !tokensData?.refresh_token) {
        console.error('❌ [AUTH] Invalid tokens received:', tokensData);
        throw new Error('Invalid tokens received');
      }

      console.log('📝 [AUTH] Storing tokens and admin info...');
      console.log('🔐 [AUTH] Access Token (first 50 chars):', tokensData.access_token.substring(0, 50));
      console.log('🔐 [AUTH] Refresh Token (first 20 chars):', tokensData.refresh_token.substring(0, 20));
      console.log('👤 [AUTH] Admin ID:', adminInfoData.admin_id);
      
      // Store tokens and admin info (temporary - for current session only)
      await setItem(STORAGE_KEYS.ACCESS_TOKEN, tokensData.access_token);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, tokensData.refresh_token);
      await setItem(STORAGE_KEYS.ADMIN_INFO, JSON.stringify(adminInfoData));
      
      // Store phone number PERMANENTLY for auto-login (only phone number, not tokens)
      await storePhoneNumberPermanently(phone, adminInfoData.admin_id);

      // Verify storage
      const storedAccessToken = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedRefreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const storedAdminInfo = await getItem(STORAGE_KEYS.ADMIN_INFO);
      
      console.log('✅ [AUTH] Storage verification:', {
        accessTokenStored: !!storedAccessToken,
        refreshTokenStored: !!storedRefreshToken,
        adminInfoStored: !!storedAdminInfo,
        accessTokenLength: storedAccessToken?.length || 0,
        refreshTokenLength: storedRefreshToken?.length || 0,
        accessTokenMatch: storedAccessToken?.substring(0, 50) === tokensData.access_token.substring(0, 50)
      });

      // Set state
      setPhoneNumber(phone.replace(/\s/g, ''));
      setTokens(tokensData);
      setAdminInfo(adminInfoData);
      setAdminId(adminInfoData.admin_id);
      setIsAuthenticated(true);

      startTokenRefresh();
      console.log('✅ [AUTH] Login successful');
      
    } catch (error) {
      console.error('❌ [AUTH] Login error:', error);
      throw error;
    }
  }, [startTokenRefresh]);

  const logout = useCallback(async () => {
    console.log('🚪 [AUTH] Logging out...');
    try {
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        console.log('📡 [AUTH] Calling logout API...');
        await api.logout(refreshToken);
      }
    } catch (error) {
      console.error('❌ [AUTH] Logout API error:', error);
    } finally {
      console.log('🧹 [AUTH] Clearing all auth data but keeping phone number...');
      
      // Clear ONLY tokens and admin info, KEEP phone number and admin ID
      await clearSessionData();
      
      queryClient.clear();
      
      // Reset auth state but keep phone number for VerifyMPIN
      setIsAuthenticated(false);
      setAdminInfo(null);
      setTokens(null);
      setLoginFlow(null);
      
      console.log('✅ [AUTH] Logout complete - Phone number preserved for auto-login');
    }
  }, [queryClient]);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔄 [AUTH] Refreshing authentication...');
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        console.log('❌ [AUTH] No refresh token found');
        return false;
      }

      const response = await api.refreshToken(refreshToken);
      const newTokens = response.data;
      
      // Validate new tokens
      if (!newTokens?.access_token || !newTokens?.refresh_token) {
        console.error('❌ [AUTH] Invalid tokens received from refresh');
        return false;
      }
      
      console.log('📝 [AUTH] Storing refreshed tokens...');
      await setItem(STORAGE_KEYS.ACCESS_TOKEN, newTokens.access_token);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, newTokens.refresh_token);
      
      setTokens(newTokens);
      console.log('✅ [AUTH] Auth refresh successful');
      return true;
    } catch (error) {
      console.error('❌ [AUTH] Auth refresh failed:', error);
      return false;
    }
  }, []);

  const updateAdminInfo = useCallback((info: Partial<AdminInfo>) => {
    setAdminInfo((prev: AdminInfo | null) => prev ? { ...prev, ...info } : null);
    
    if (adminInfo) {
      const updatedInfo = { ...adminInfo, ...info };
      setItem(STORAGE_KEYS.ADMIN_INFO, JSON.stringify(updatedInfo)).catch(console.error);
    }
  }, [adminInfo]);

  const checkExistingSession = useCallback(async () => {
    try {
      console.log('🔍 [AUTH] Checking existing session...');
      const formattedPhone = await getFormattedPhoneNumber();
      if (!formattedPhone) {
        console.log('❌ [AUTH] No phone number to check session');
        return;
      }

      const response = await api.loginInitiate(formattedPhone);
      console.log('📱 [AUTH] Login initiate response:', response.data);
      
      if (response.data.success) {
        const { user_exists, has_mpin, mpin_locked, device_trusted } = response.data.data;
        
        if (user_exists && !mpin_locked) {
          if (device_trusted && has_mpin) {
            setLoginFlow('existing_user_mpin');
          } else if (!device_trusted) {
            setLoginFlow('device_not_trusted');
          } else if (!has_mpin) {
            setLoginFlow('new_user_no_mpin');
          }
        }
      }
    } catch (error) {
      console.error('❌ [AUTH] Session check error:', error);
    }
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    isInitializing,
    adminInfo,
    tokens,
    phoneNumber,
    adminId,
    loginFlow,
    login,
    logout,
    refreshAuth,
    updateAdminInfo,
    checkExistingSession,
    storePhoneNumber,
    clearPhoneNumber,
    validateSession,
    clearTokensAndNavigate,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};