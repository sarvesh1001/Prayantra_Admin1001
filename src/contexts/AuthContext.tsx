import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdminInfo, AuthTokens, LoginFlowState, ApiError } from '@/types';
import { api } from '@/services/api';
import { 
  getItem, 
  setItem, 
  removeItem, 
  clearSessionData,
  STORAGE_KEYS,
  hasStoredPhoneNumber,
  getFormattedPhoneNumber
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
  loginFlow: LoginFlowState | null;
  login: (phone: string, tokens: AuthTokens, adminInfo: AdminInfo) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  updateAdminInfo: (info: Partial<AdminInfo>) => void;
  checkExistingSession: () => Promise<void>;
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
  const [loginFlow, setLoginFlow] = useState<LoginFlowState | null>(null);
  const queryClient = useQueryClient();

  const initializeAuth = useCallback(async () => {
    try {
      setIsInitializing(true);
      
      const hasPhone = await hasStoredPhoneNumber();
      const formattedPhone = await getFormattedPhoneNumber();
      
      if (hasPhone && formattedPhone) {
        setPhoneNumber(formattedPhone);
        
        const accessToken = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const storedAdminInfo = await getItem(STORAGE_KEYS.ADMIN_INFO);
        
        if (accessToken && refreshToken && storedAdminInfo) {
          const adminInfoData = JSON.parse(storedAdminInfo);
          const tokensData: AuthTokens = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 900,
            token_type: 'Bearer'
          };
          
          setAdminInfo(adminInfoData);
          setTokens(tokensData);
          setIsAuthenticated(true);
          
          startTokenRefresh();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      await clearSessionData();
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const startTokenRefresh = useCallback(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const response = await api.refreshToken(refreshToken);
          const newTokens = response.data;
          
          await setItem(STORAGE_KEYS.ACCESS_TOKEN, newTokens.access_token);
          await setItem(STORAGE_KEYS.REFRESH_TOKEN, newTokens.refresh_token);
          
          setTokens(newTokens);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        await logout();
      }
    }, 4.5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  const login = useCallback(async (
    phone: string, 
    tokensData: AuthTokens, 
    adminInfoData: AdminInfo
  ) => {
    try {
      const phoneWithoutCountryCode = phone.replace('+91', '');
      await setItem(STORAGE_KEYS.PHONE_NUMBER, phoneWithoutCountryCode);
      await setItem(STORAGE_KEYS.COUNTRY_CODE, '+91');
      await setItem(STORAGE_KEYS.ACCESS_TOKEN, tokensData.access_token);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, tokensData.refresh_token);
      await setItem(STORAGE_KEYS.ADMIN_INFO, JSON.stringify(adminInfoData));
      await setItem(STORAGE_KEYS.ADMIN_ID, adminInfoData.admin_id);

      setPhoneNumber(phone);
      setTokens(tokensData);
      setAdminInfo(adminInfoData);
      setIsAuthenticated(true);

      startTokenRefresh();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [startTokenRefresh]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await api.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await clearSessionData();
      queryClient.clear();
      setIsAuthenticated(false);
      setAdminInfo(null);
      setTokens(null);
      setLoginFlow(null);
    }
  }, [queryClient]);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return false;

      const response = await api.refreshToken(refreshToken);
      const newTokens = response.data;
      
      await setItem(STORAGE_KEYS.ACCESS_TOKEN, newTokens.access_token);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, newTokens.refresh_token);
      
      setTokens(newTokens);
      return true;
    } catch (error) {
      console.error('Auth refresh failed:', error);
      await logout();
      return false;
    }
  }, [logout]);

  const updateAdminInfo = useCallback((info: Partial<AdminInfo>) => {
    setAdminInfo((prev: AdminInfo | null) => prev ? { ...prev, ...info } : null);
    
    if (adminInfo) {
      const updatedInfo = { ...adminInfo, ...info };
      setItem(STORAGE_KEYS.ADMIN_INFO, JSON.stringify(updatedInfo));
    }
  }, [adminInfo]);

  const checkExistingSession = useCallback(async () => {
    try {
      const formattedPhone = await getFormattedPhoneNumber();
      if (!formattedPhone) return;

      const response = await api.loginInitiate(formattedPhone);
      
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
      console.error('Session check error:', error);
    }
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    isInitializing,
    adminInfo,
    tokens,
    phoneNumber,
    loginFlow,
    login,
    logout,
    refreshAuth,
    updateAdminInfo,
    checkExistingSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};