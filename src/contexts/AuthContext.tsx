import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { AdminInfo, AuthTokens, LoginFlowState } from '@/types';
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
  clearSessionData,
} from '@/services/storage';
import { useQueryClient } from '@tanstack/react-query';

/* ============================================================
   TYPES
   ============================================================ */

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  adminInfo: AdminInfo | null;
  tokens: AuthTokens | null;
  phoneNumber: string | null;
  adminId: string | null;
  loginFlow: LoginFlowState | null;

  login: (
    phone: string,
    tokens: AuthTokens,
    adminInfo: AdminInfo
  ) => Promise<void>;

  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  updateAdminInfo: (info: Partial<AdminInfo>) => void;

  checkExistingSession: () => Promise<void>;
  storePhoneNumber: (phone: string, adminId?: string) => Promise<void>;
  clearPhoneNumber: () => Promise<void>;
  clearTokensAndNavigate: () => Promise<void>;
}

/* ============================================================
   CONTEXT
   ============================================================ */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

/* ============================================================
   PROVIDER
   ============================================================ */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);

  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [loginFlow, setLoginFlow] = useState<LoginFlowState | null>(null);

  /* ============================================================
     VALIDATE SESSION (NO DIRECT REFRESH HERE)
     ============================================================ */

  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 [AUTH] Validating session');

      const accessToken = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) {
        console.log('❌ [AUTH] No access token');
        return false;
      }

      // Decode JWT expiry
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expMs = payload.exp * 1000;
        const now = Date.now();

        console.log('⏰ [AUTH] Token expires in', Math.floor((expMs - now) / 1000), 'sec');

        // IMPORTANT: allow interceptor to refresh
        if (now >= expMs) {
          console.log('⏰ [AUTH] Token expired — interceptor will refresh');
          return true;
        }
      } catch {
        console.warn('⚠️ [AUTH] Failed to decode token');
      }

      const response = await api.validateSession();
      return response.data?.data?.valid === true;
    } catch (err) {
      console.error('❌ [AUTH] Session validation failed', err);
      return false;
    }
  }, []);

  /* ============================================================
     5-MIN VALIDATION LOOP (SAFE)
     ============================================================ */

  // useEffect(() => {
  //   if (!isAuthenticated) return;

  //   const interval = setInterval(async () => {
  //     console.log('⏱️ [AUTH] 5-minute session check');
  //     await validateSession();
  //   }, 5 * 60 * 1000);

  //   return () => clearInterval(interval);
  // }, [isAuthenticated, validateSession]);

  /* ============================================================
     PHONE NUMBER STORAGE
     ============================================================ */

  const storePhoneNumber = useCallback(
    async (phone: string, adminId?: string) => {
      const formatted = phone.replace(/\s/g, '');

      if (adminId) {
        await storePhoneNumberPermanently(formatted, adminId);
        setAdminId(adminId);
      } else {
        await setItem(STORAGE_KEYS.PHONE_NUMBER, formatted);
      }

      setPhoneNumber(formatted);
    },
    []
  );

  const clearPhoneNumber = useCallback(async () => {
    await removePhoneNumberPermanently();
    setPhoneNumber(null);
    setAdminId(null);
  }, []);

  /* ============================================================
     INITIALIZE AUTH (ON APP START)
     ============================================================ */

  const initializeAuth = useCallback(async () => {
    try {
      setIsInitializing(true);
      setIsLoading(true);

      // Always clear tokens on cold start
      await clearSessionData();

      const hasPhone = await hasStoredPhoneNumber();
      const formattedPhone = await getFormattedPhoneNumber();

      if (hasPhone && formattedPhone) {
        setPhoneNumber(formattedPhone);
        const storedAdminId = await getItem(STORAGE_KEYS.ADMIN_ID);
        if (storedAdminId) setAdminId(storedAdminId);
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('❌ [AUTH] Initialization error', err);
    } finally {
      setIsInitializing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /* ============================================================
     LOGIN
     ============================================================ */

  const login = useCallback(
    async (phone: string, tokensData: AuthTokens, admin: AdminInfo) => {
      if (!tokensData?.access_token || !tokensData?.refresh_token) {
        throw new Error('Invalid tokens received');
      }

      await setItem(STORAGE_KEYS.ACCESS_TOKEN, tokensData.access_token);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, tokensData.refresh_token);
      await setItem(STORAGE_KEYS.ADMIN_INFO, JSON.stringify(admin));

      await storePhoneNumberPermanently(phone, admin.admin_id);

      setTokens(tokensData);
      setAdminInfo(admin);
      setAdminId(admin.admin_id);
      setPhoneNumber(phone.replace(/\s/g, ''));
      setIsAuthenticated(true);

      console.log('✅ [AUTH] Login successful');
    },
    []
  );

  /* ============================================================
     LOGOUT
     ============================================================ */

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await api.logout(refreshToken);
      }
    } catch (err) {
      console.warn('⚠️ [AUTH] Logout API failed', err);
    } finally {
      await clearSessionData();
      queryClient.clear();

      setIsAuthenticated(false);
      setAdminInfo(null);
      setTokens(null);
      setLoginFlow(null);

      console.log('✅ [AUTH] Logged out');
    }
  }, [queryClient]);

  /* ============================================================
     CLEAR TOKENS (SESSION FAILURE)
     ============================================================ */

  const clearTokensAndNavigate = useCallback(async () => {
    await clearSessionData();
    queryClient.clear();

    setIsAuthenticated(false);
    setAdminInfo(null);
    setTokens(null);
    setLoginFlow(null);
  }, [queryClient]);

  /* ============================================================
     UPDATE ADMIN INFO
     ============================================================ */

  const updateAdminInfo = useCallback(
    (info: Partial<AdminInfo>) => {
      setAdminInfo((prev) => (prev ? { ...prev, ...info } : prev));
      if (adminInfo) {
        setItem(
          STORAGE_KEYS.ADMIN_INFO,
          JSON.stringify({ ...adminInfo, ...info })
        ).catch(console.error);
      }
    },
    [adminInfo]
  );

  /* ============================================================
     CHECK EXISTING SESSION (LOGIN FLOW)
     ============================================================ */

  const checkExistingSession = useCallback(async () => {
    const formattedPhone = await getFormattedPhoneNumber();
    if (!formattedPhone) return;

    const response = await api.loginInitiate(formattedPhone);
    if (!response.data?.success) return;

    const { user_exists, has_mpin, mpin_locked, device_trusted } =
      response.data.data;

    if (user_exists && !mpin_locked) {
      if (device_trusted && has_mpin) {
        setLoginFlow('existing_user_mpin');
      } else if (!device_trusted) {
        setLoginFlow('device_not_trusted');
      } else {
        setLoginFlow('new_user_no_mpin');
      }
    }
  }, []);

  /* ============================================================
     CONTEXT VALUE
     ============================================================ */

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
    validateSession,
    updateAdminInfo,

    checkExistingSession,
    storePhoneNumber,
    clearPhoneNumber,
    clearTokensAndNavigate,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
