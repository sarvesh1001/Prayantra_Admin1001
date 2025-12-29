import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { Platform } from 'react-native';
import { getItem, setItem, removeItem, STORAGE_KEYS } from './storage';
import { getStoredDeviceInfo } from './deviceInfo';
import { ApiError } from '@/types';

/* ============================================================
   API CONFIG
   ============================================================ */

const API_BASE_URL = 'http://192.168.31.102:8080/api/v1';
const API_TIMEOUT = 30000;

/* ============================================================
   API SERVICE (SINGLETON)
   ============================================================ */

class ApiService {
  private static instance: ApiService;
  private api: AxiosInstance;

  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  private constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Platform': Platform.OS,
        'X-App-Version': '1.0.0',
      },
    });

    this.setupInterceptors();
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /* ============================================================
     INTERCEPTORS
     ============================================================ */

  private setupInterceptors() {
    /* ---------------- REQUEST ---------------- */
    this.api.interceptors.request.use(
      async (config) => {
        const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);

        if (token) {
          (config.headers as any).Authorization = `Bearer ${token}`;
        }

        // Attach device info to auth / otp requests
        if (config.url?.includes('/auth') || config.url?.includes('/otp')) {
          const device = await getStoredDeviceInfo();

          if (config.method !== 'get' && config.data) {
            config.data.device_id = device.deviceId;
            config.data.device_fingerprint = device.deviceFingerprint;
            config.data.user_agent = device.userAgent;
          }
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    /* ---------------- RESPONSE ---------------- */
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        /* ---------- RATE LIMIT ---------- */
        if (error.response?.status === 429) {
          const retryAfter = error.response.data?.retry_after || 5;
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          return this.api(originalRequest);
        }

        /* ---------- UNAUTHORIZED ---------- */
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => this.api(originalRequest));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (!refreshToken) throw new Error('No refresh token');

            const response = await this.refreshToken(refreshToken);
            const newAccessToken = response.data.access_token;

            await setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
            await setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token);

            this.processQueue(null, newAccessToken);

            if (!originalRequest.headers) {
              originalRequest.headers = {};
            }

            (originalRequest.headers as any).Authorization =
              `Bearer ${newAccessToken}`;

            return this.api(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);

            await removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            await removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            await removeItem(STORAGE_KEYS.ADMIN_INFO);

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      },
    );
  }

  private processQueue(error: unknown, token: string | null) {
    this.failedQueue.forEach((p) =>
      error ? p.reject(error) : p.resolve(token),
    );
    this.failedQueue = [];
  }

  /* ============================================================
     AUTH APIs
     ============================================================ */

  async loginInitiate(phoneNumber: string) {
    const d = await getStoredDeviceInfo();
    return this.api.post('/admin-auth/login/initiate', {
      phone_number: phoneNumber,
      device_id: d.deviceId,
      device_fingerprint: d.deviceFingerprint,
    });
  }

  async sendOTP(phoneNumber: string, purpose: 'admin_login') {
    const d = await getStoredDeviceInfo();
    return this.api.post('/otp/send', {
      phone_number: phoneNumber,
      purpose,
      device_id: d.deviceId,
      device_fingerprint: d.deviceFingerprint,
      user_agent: d.userAgent,
    });
  }

  async verifyOTP(phoneNumber: string, otp: string) {
    const d = await getStoredDeviceInfo();
    return this.api.post('/admin-auth/login/verify-otp', {
      phone_number: phoneNumber,
      otp,
      device_id: d.deviceId,
      device_fingerprint: d.deviceFingerprint,
      user_agent: d.userAgent,
    });
  }

  async verifyMPIN(phoneNumber: string, mpin: string) {
    const d = await getStoredDeviceInfo();
    return this.api.post('/admin-auth/login/verify-mpin', {
      phone_number: phoneNumber,
      mpin,
      device_id: d.deviceId,
      device_fingerprint: d.deviceFingerprint,
      user_agent: d.userAgent,
    });
  }

  async setupMPIN(adminId: string, mpin: string) {
    const d = await getStoredDeviceInfo();
    return this.api.post('/admin-auth/mpin/setup', {
      admin_id: adminId,
      mpin,
      device_id: d.deviceId,
      device_fingerprint: d.deviceFingerprint,
      user_agent: d.userAgent,
    });
  }

  async validateSession() {
    const d = await getStoredDeviceInfo();
    return this.api.get('/auth/validate', {
      headers: { 'X-Device-ID': d.deviceId },
    });
  }

  async refreshToken(refreshToken: string) {
    return this.api.post('/admin-auth/refresh', {
      refresh_token: refreshToken,
    });
  }

  async logout(refreshToken: string) {
    return this.api.post('/admin-auth/logout', {
      refresh_token: refreshToken,
    });
  }

  /* ============================================================
     ADMIN APIs
     ============================================================ */

  async getAdminProfile() {
    return this.api.get('/admin/profile');
  }

  async changeMPIN(adminId: string, current: string, next: string) {
    const d = await getStoredDeviceInfo();
    return this.api.post('/admin-auth/mpin/change', {
      admin_id: adminId,
      current_mpin: current,
      new_mpin: next,
      device_id: d.deviceId,
      device_fingerprint: d.deviceFingerprint,
      user_agent: d.userAgent,
    });
  }

  async forgotMPIN(phoneNumber: string) {
    const d = await getStoredDeviceInfo();
    return this.api.post('/admin-auth/mpin/forgot', {
      phone_number: phoneNumber,
      device_id: d.deviceId,
      device_fingerprint: d.deviceFingerprint,
      user_agent: d.userAgent,
    });
  }

  async verifyForgotMPIN(phoneNumber: string, otp: string, newMpin: string) {
    const d = await getStoredDeviceInfo();
    return this.api.post('/admin-auth/mpin/forgot/verify', {
      phone_number: phoneNumber,
      otp_code: otp,
      new_mpin: newMpin,
      device_id: d.deviceId,
      device_fingerprint: d.deviceFingerprint,
      user_agent: d.userAgent,
    });
  }
}

/* ============================================================
   EXPORT
   ============================================================ */

export const api = ApiService.getInstance();

// import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
// import { getItem, setItem, removeItem, STORAGE_KEYS } from './storage';
// import { Platform } from 'react-native';
// import { getStoredDeviceInfo } from './deviceInfo';
// import { AuthTokens, ApiError } from '@/types';

// const API_BASE_URL = 'http://192.168.31.102:8080/api/v1';
// const API_TIMEOUT = 30000;

// class ApiService {
//   private static instance: ApiService;
//   private isRefreshing = false;
//   private failedQueue: Array<{
//     resolve: (value?: unknown) => void;
//     reject: (reason?: unknown) => void;
//   }> = [];

//   private constructor() {
//     this.setupInterceptors();
//   }

//   static getInstance(): ApiService {
//     if (!ApiService.instance) {
//       ApiService.instance = new ApiService();
//     }
//     return ApiService.instance;
//   }

//   private getApi() {
//     return axios.create({
//       baseURL: API_BASE_URL,
//       timeout: API_TIMEOUT,
//       headers: {
//         'Content-Type': 'application/json',
//         'Accept': 'application/json',
//         'X-Platform': Platform.OS,
//         'X-App-Version': '1.0.0',
//       },
//     });
//   }

//   private setupInterceptors() {
//     const api = this.getApi();

//     // Request interceptor - ADDED DEBUG LOGGING
//     api.interceptors.request.use(
//       async (config) => {
//         try {
//           console.log('🔐 [INTERCEPTOR] Request URL:', config.url);
//           console.log('🔐 [INTERCEPTOR] Request Method:', config.method?.toUpperCase());
          
//           const accessToken = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
//           console.log('🔐 [INTERCEPTOR] Access Token Available:', !!accessToken);
//           console.log('🔐 [INTERCEPTOR] Access Token Preview:', accessToken ? `${accessToken.substring(0, 30)}...` : 'NONE');
          
//           if (accessToken) {
//             const authHeader = `Bearer ${accessToken}`;
//             config.headers.Authorization = authHeader;
//             console.log('✅ [INTERCEPTOR] Set Authorization Header for:', config.url);
//             console.log('✅ [INTERCEPTOR] Auth Header Preview:', authHeader.substring(0, 50) + '...');
//           } else {
//             console.log('⚠️ [INTERCEPTOR] NO ACCESS TOKEN FOUND for:', config.url);
//           }

//           // Add device info for auth endpoints
//           if (config.url?.includes('/auth') || config.url?.includes('/otp')) {
//             const deviceInfo = await getStoredDeviceInfo();
//             if (config.data && deviceInfo) {
//               config.data.device_id = deviceInfo.deviceId;
//               config.data.device_fingerprint = deviceInfo.deviceFingerprint;
//               config.data.user_agent = deviceInfo.userAgent;
//             }
//           }

//           // Log final headers
//           console.log('📤 [INTERCEPTOR] Final Headers for', config.url, ':', {
//             Authorization: config.headers.Authorization ? '✅ Present' : '❌ Missing',
//             'X-Device-ID': config.headers['X-Device-ID'] || 'Not set',
//             'Content-Type': config.headers['Content-Type'],
//           });

//           return config;
//         } catch (error) {
//           console.error('❌ [INTERCEPTOR] Error:', error);
//           return Promise.reject(error);
//         }
//       },
//       (error) => {
//         console.error('❌ [INTERCEPTOR] Request error:', error);
//         return Promise.reject(error);
//       }
//     );

//     // Response interceptor - ADDED DEBUG LOGGING
//     api.interceptors.response.use(
//       (response) => {
//         console.log('✅ [INTERCEPTOR] Response:', {
//           url: response.config.url,
//           status: response.status,
//           data: response.data
//         });
//         return response;
//       },
//       async (error: AxiosError<ApiError>) => {
//         console.error('❌ [INTERCEPTOR] Response error:', {
//           url: error.config?.url,
//           status: error.response?.status,
//           data: error.response?.data,
//           headers: error.config?.headers
//         });

//         const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

//         // Handle 429 Rate Limit
//         if (error.response?.status === 429) {
//           const retryAfter = error.response.data?.retry_after || 5;
//           console.log(`⏰ [INTERCEPTOR] Rate limited, retrying after ${retryAfter}s`);
//           await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
//           return this.getApi()(originalRequest);
//         }

//         // Handle 401 Unauthorized
//         if (error.response?.status === 401 && !originalRequest._retry) {
//           if (error.response.data?.error === 'MPIN rate limit exceeded') {
//             throw error;
//           }

//           if (this.isRefreshing) {
//             console.log('🔄 [INTERCEPTOR] Already refreshing token, queuing request');
//             return new Promise((resolve, reject) => {
//               this.failedQueue.push({ resolve, reject });
//             }).then(() => this.getApi()(originalRequest))
//               .catch(err => Promise.reject(err));
//           }

//           originalRequest._retry = true;
//           this.isRefreshing = true;
//           console.log('🔄 [INTERCEPTOR] Starting token refresh...');

//           try {
//             const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
            
//             if (!refreshToken) {
//               console.error('❌ [INTERCEPTOR] No refresh token available');
//               throw new Error('No refresh token available');
//             }

//             const response = await this.refreshToken(refreshToken);
//             const newAccessToken = response.data.access_token;
            
//             console.log('✅ [INTERCEPTOR] Token refresh successful');
            
//             await setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
//             await setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token);

//             // Retry failed requests
//             this.processQueue(null, newAccessToken);

//             // Retry original request
//             originalRequest.headers = {
//               ...originalRequest.headers,
//               Authorization: `Bearer ${newAccessToken}`,
//             };
            
//             return this.getApi()(originalRequest);
//           } catch (refreshError) {
//             console.error('❌ [INTERCEPTOR] Token refresh failed:', refreshError);
//             this.processQueue(refreshError, null);
            
//             // Clear all auth data
//             await removeItem(STORAGE_KEYS.ACCESS_TOKEN);
//             await removeItem(STORAGE_KEYS.REFRESH_TOKEN);
//             await removeItem(STORAGE_KEYS.ADMIN_INFO);
            
//             throw refreshError;
//           } finally {
//             this.isRefreshing = false;
//           }
//         }

//         return Promise.reject(error);
//       }
//     );

//     return api;
//   }

//   private processQueue(error: unknown, token: string | null) {
//     this.failedQueue.forEach(promise => {
//       if (error) {
//         promise.reject(error);
//       } else {
//         promise.resolve(token);
//       }
//     });
//     this.failedQueue = [];
//   }

//   // Auth APIs
//   async loginInitiate(phoneNumber: string) {
//     const deviceInfo = await getStoredDeviceInfo();
//     return this.getApi().post('/admin-auth/login/initiate', {
//       phone_number: phoneNumber,
//       device_id: deviceInfo.deviceId,
//       device_fingerprint: deviceInfo.deviceFingerprint,
//     });
//   }

//   async sendOTP(phoneNumber: string, purpose: 'admin_login') {
//     const deviceInfo = await getStoredDeviceInfo();
//     return this.getApi().post('/otp/send', {
//       phone_number: phoneNumber,
//       purpose,
//       device_id: deviceInfo.deviceId,
//       device_fingerprint: deviceInfo.deviceFingerprint,
//       user_agent: deviceInfo.userAgent,
//     });
//   }

//   async verifyOTP(phoneNumber: string, otp: string) {
//     const deviceInfo = await getStoredDeviceInfo();
//     return this.getApi().post('/admin-auth/login/verify-otp', {
//       phone_number: phoneNumber,
//       otp,
//       device_id: deviceInfo.deviceId,
//       device_fingerprint: deviceInfo.deviceFingerprint,
//       user_agent: deviceInfo.userAgent,
//     });
//   }

//   async setupMPIN(adminId: string, mpin: string) {
//     const deviceInfo = await getStoredDeviceInfo();
//     return this.getApi().post('/admin-auth/mpin/setup', {
//       admin_id: adminId,
//       mpin,
//       device_id: deviceInfo.deviceId,
//       device_fingerprint: deviceInfo.deviceFingerprint,
//       user_agent: deviceInfo.userAgent,
//     });
//   }

//   async verifyMPIN(phoneNumber: string, mpin: string) {
//     const deviceInfo = await getStoredDeviceInfo();
//     return this.getApi().post('/admin-auth/login/verify-mpin', {
//       phone_number: phoneNumber,
//       mpin,
//       device_id: deviceInfo.deviceId,
//       device_fingerprint: deviceInfo.deviceFingerprint,
//       user_agent: deviceInfo.userAgent,
//     });
//   }

//   async changeMPIN(adminId: string, currentMpin: string, newMpin: string) {
//     const deviceInfo = await getStoredDeviceInfo();
//     return this.getApi().post('/admin-auth/mpin/change', {
//       admin_id: adminId,
//       current_mpin: currentMpin,
//       new_mpin: newMpin,
//       device_id: deviceInfo.deviceId,
//       device_fingerprint: deviceInfo.deviceFingerprint,
//       user_agent: deviceInfo.userAgent,
//     });
//   }

//   async forgotMPIN(phoneNumber: string) {
//     const deviceInfo = await getStoredDeviceInfo();
//     return this.getApi().post('/admin-auth/mpin/forgot', {
//       phone_number: phoneNumber,
//       device_id: deviceInfo.deviceId,
//       device_fingerprint: deviceInfo.deviceFingerprint,
//       user_agent: deviceInfo.userAgent,
//     });
//   }

//   async validateSession() {
//     console.log('🔍 [API] Starting session validation...');
    
//     const deviceInfo = await getStoredDeviceInfo();
//     console.log('📱 [API] Device ID for validation:', deviceInfo.deviceId);
    
//     // Check token before making request
//     const accessToken = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
//     console.log('🔐 [API] Token check before request:', {
//       hasToken: !!accessToken,
//       tokenLength: accessToken?.length || 0,
//       tokenPreview: accessToken ? `${accessToken.substring(0, 30)}...` : 'NONE'
//     });
    
//     return this.getApi().get('/auth/validate', {
//       headers: {
//         'X-Device-ID': deviceInfo.deviceId,
//         // Authorization header should be added by interceptor
//       },
//     });
//   }

//   async verifyForgotMPIN(phoneNumber: string, otpCode: string, newMpin: string) {
//     const deviceInfo = await getStoredDeviceInfo();
//     return this.getApi().post('/admin-auth/mpin/forgot/verify', {
//       phone_number: phoneNumber,
//       device_id: deviceInfo.deviceId,
//       new_mpin: newMpin,
//       otp_code: otpCode,
//       device_fingerprint: deviceInfo.deviceFingerprint,
//       user_agent: deviceInfo.userAgent,
//     });
//   }

//   async refreshToken(refreshToken: string) {
//     console.log('🔄 [API] Refreshing token...');
//     return this.getApi().post('/admin-auth/refresh', {
//       refresh_token: refreshToken,
//     });
//   }

//   async logout(refreshToken: string) {
//     console.log('🚪 [API] Logging out...');
//     return this.getApi().post('/admin-auth/logout', {
//       refresh_token: refreshToken,
//     });
//   }

//   // Admin Profile API
//   async getAdminProfile() {
//     console.log('👤 [API] Getting admin profile...');
//     return this.getApi().get('/admin/profile');
//   }
// }

// export const api = ApiService.getInstance();