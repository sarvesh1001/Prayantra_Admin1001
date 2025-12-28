import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getItem, setItem, removeItem, STORAGE_KEYS } from './storage';
import { Platform } from 'react-native';
import { getStoredDeviceInfo } from './deviceInfo';
import { AuthTokens, ApiError } from '@/types';

const API_BASE_URL = 'http://192.168.31.102:8080/api/v1';
const API_TIMEOUT = 30000;

class ApiService {
  private static instance: ApiService;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  private constructor() {
    this.setupInterceptors();
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private getApi() {
    return axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Platform': Platform.OS,
        'X-App-Version': '1.0.0',
      },
    });
  }

  private setupInterceptors() {
    const api = this.getApi();

    // Request interceptor
    api.interceptors.request.use(
      async (config) => {
        try {
          const accessToken = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
          
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }

          // Add device info for auth endpoints
          if (config.url?.includes('/auth') || config.url?.includes('/otp')) {
            const deviceInfo = await getStoredDeviceInfo();
            if (config.data && deviceInfo) {
              config.data.device_id = deviceInfo.deviceId;
              config.data.device_fingerprint = deviceInfo.deviceFingerprint;
              config.data.user_agent = deviceInfo.userAgent;
            }
          }

          return config;
        } catch (error) {
          return Promise.reject(error);
        }
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 429 Rate Limit
        if (error.response?.status === 429) {
          const retryAfter = error.response.data?.retry_after || 5;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.getApi()(originalRequest);
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (error.response.data?.error === 'MPIN rate limit exceeded') {
            throw error;
          }

          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => this.getApi()(originalRequest))
              .catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
            
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await this.refreshToken(refreshToken);
            const newAccessToken = response.data.access_token;
            
            await setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
            await setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token);

            // Retry failed requests
            this.processQueue(null, newAccessToken);

            // Retry original request
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${newAccessToken}`,
            };
            
            return this.getApi()(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            
            // Clear all auth data
            await removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            await removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            await removeItem(STORAGE_KEYS.ADMIN_INFO);
            
            throw refreshError;
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );

    return api;
  }

  private processQueue(error: unknown, token: string | null) {
    this.failedQueue.forEach(promise => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  // Auth APIs
  async loginInitiate(phoneNumber: string) {
    const deviceInfo = await getStoredDeviceInfo();
    return this.getApi().post('/admin-auth/login/initiate', {
      phone_number: phoneNumber,
      device_id: deviceInfo.deviceId,
      device_fingerprint: deviceInfo.deviceFingerprint,
    });
  }

  async sendOTP(phoneNumber: string, purpose: 'admin_login') {
    const deviceInfo = await getStoredDeviceInfo();
    return this.getApi().post('/otp/send', {
      phone_number: phoneNumber,
      purpose,
      device_id: deviceInfo.deviceId,
      device_fingerprint: deviceInfo.deviceFingerprint,
      user_agent: deviceInfo.userAgent,
    });
  }

  async verifyOTP(phoneNumber: string, otp: string) {
    const deviceInfo = await getStoredDeviceInfo();
    return this.getApi().post('/admin-auth/login/verify-otp', {
      phone_number: phoneNumber,
      otp,
      device_id: deviceInfo.deviceId,
      device_fingerprint: deviceInfo.deviceFingerprint,
      user_agent: deviceInfo.userAgent,
    });
  }

  async setupMPIN(adminId: string, mpin: string) {
    const deviceInfo = await getStoredDeviceInfo();
    return this.getApi().post('/admin-auth/mpin/setup', {
      admin_id: adminId,
      mpin,
      device_id: deviceInfo.deviceId,
      device_fingerprint: deviceInfo.deviceFingerprint,
      user_agent: deviceInfo.userAgent,
    });
  }

  async verifyMPIN(phoneNumber: string, mpin: string) {
    const deviceInfo = await getStoredDeviceInfo();
    return this.getApi().post('/admin-auth/login/verify-mpin', {
      phone_number: phoneNumber,
      mpin,
      device_id: deviceInfo.deviceId,
      device_fingerprint: deviceInfo.deviceFingerprint,
      user_agent: deviceInfo.userAgent,
    });
  }

  async changeMPIN(adminId: string, currentMpin: string, newMpin: string) {
    const deviceInfo = await getStoredDeviceInfo();
    return this.getApi().post('/admin-auth/mpin/change', {
      admin_id: adminId,
      current_mpin: currentMpin,
      new_mpin: newMpin,
      device_id: deviceInfo.deviceId,
      device_fingerprint: deviceInfo.deviceFingerprint,
      user_agent: deviceInfo.userAgent,
    });
  }

  async forgotMPIN(phoneNumber: string) {
    const deviceInfo = await getStoredDeviceInfo();
    return this.getApi().post('/admin-auth/mpin/forgot', {
      phone_number: phoneNumber,
      device_id: deviceInfo.deviceId,
      device_fingerprint: deviceInfo.deviceFingerprint,
      user_agent: deviceInfo.userAgent,
    });
  }

  async verifyForgotMPIN(phoneNumber: string, otpCode: string, newMpin: string) {
    const deviceInfo = await getStoredDeviceInfo();
    return this.getApi().post('/admin-auth/mpin/forgot/verify', {
      phone_number: phoneNumber,
      device_id: deviceInfo.deviceId,
      new_mpin: newMpin,
      otp_code: otpCode,
      device_fingerprint: deviceInfo.deviceFingerprint,
      user_agent: deviceInfo.userAgent,
    });
  }

  async refreshToken(refreshToken: string) {
    return this.getApi().post('/admin-auth/refresh', {
      refresh_token: refreshToken,
    });
  }

  async logout(refreshToken: string) {
    return this.getApi().post('/admin-auth/logout', {
      refresh_token: refreshToken,
    });
  }

  // Admin Profile API
  async getAdminProfile() {
    return this.getApi().get('/admin/profile');
  }
}

export const api = ApiService.getInstance();