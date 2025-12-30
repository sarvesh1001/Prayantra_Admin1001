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

  /* ============================================================
     REFRESH CONTROL
     ============================================================ */

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
    /* ================= REQUEST ================= */

    this.api.interceptors.request.use(
      async (config) => {
        const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const device = await getStoredDeviceInfo();

        if (token) {
          (config.headers as any).Authorization = `Bearer ${token}`;
        }

        const isAuthRequest =
          config.url?.includes('/auth') ||
          config.url?.includes('/otp');

        if (!isAuthRequest && device?.deviceId) {
          (config.headers as any)['X-Device-ID'] = device.deviceId;
        }

        if (isAuthRequest && config.method !== 'get' && config.data) {
          config.data.device_id = device.deviceId;
          config.data.device_fingerprint = device.deviceFingerprint;
          config.data.user_agent = device.userAgent;
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    /* ================= RESPONSE ================= */

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

          /* ❌ NEVER refresh for /auth/validate */
          if (originalRequest.url?.includes('/auth/validate')) {
            return Promise.reject(error);
          }

          /* ❌ NEVER refresh refresh endpoint */
          if (originalRequest.url?.includes('/admin-auth/refresh')) {
            await removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            await removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            await removeItem(STORAGE_KEYS.ADMIN_INFO);
            return Promise.reject(error);
          }

          /* ---------- QUEUE WHILE REFRESHING ---------- */
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => this.api(originalRequest));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await this.refreshToken(refreshToken);

            const newAccessToken = response.data?.access_token;
            const newRefreshToken = response.data?.refresh_token;

            if (!newAccessToken) {
              throw new Error('Invalid refresh response');
            }

            await setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
            if (newRefreshToken) {
              await setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
            }

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

  /* ============================================================
     QUEUE HANDLER
     ============================================================ */

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

  async getAdminDepartments(adminId: string) {
    const device = await getStoredDeviceInfo();
    return this.api.get(`/admin/admins/${adminId}/departments`, {
      headers: { 'X-Device-ID': device.deviceId },
    });
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

  /* ============================================================
     SYSTEM & PERMISSIONS APIs
     ============================================================ */

  async getPermissionsByModule(moduleCode: string) {
    const device = await getStoredDeviceInfo();
    return this.api.get(`/admin/system/permissions/module/${moduleCode}`, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  /* ============================================================
     ROLE MANAGEMENT APIs
     ============================================================ */

  async createEmployeeRole(roleData: any) {
    const device = await getStoredDeviceInfo();
    return this.api.post('/admin/roles/employee', roleData, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async getEmployeeRoles() {
    const device = await getStoredDeviceInfo();
    return this.api.get('/admin/roles/employee', {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async getEmployeeRolesByType(type: number = 1) {
    const device = await getStoredDeviceInfo();
    return this.api.get(`/admin/roles/type/${type}`, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async createManagerRole(roleData: any) {
    const device = await getStoredDeviceInfo();
    return this.api.post('/admin/roles/manager', roleData, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async getManagerRoles() {
    const device = await getStoredDeviceInfo();
    return this.api.get('/admin/roles/manager', {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async getManagerRolesByType(type: number = 2) {
    const device = await getStoredDeviceInfo();
    return this.api.get(`/admin/roles/type/${type}`, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }
  // In your ApiService class in api.ts
  async getAdminRoleWithDetails(roleId: string) {
    const device = await getStoredDeviceInfo();
    return this.api.get(`/admin/roles/${roleId}/details`, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }
  async getAllRoles(params?: { limit?: number; offset?: number }) {
    const device = await getStoredDeviceInfo();
    return this.api.get('/admin/roles', {
      params,
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async searchRoles(query: string, params?: { limit?: number; offset?: number }) {
    const device = await getStoredDeviceInfo();
    return this.api.get('/admin/roles/search', {
      params: { q: query, ...params },
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async getRoleDetails(roleId: string) {
    const device = await getStoredDeviceInfo();
    return this.api.get(`/admin/roles/${roleId}/details`, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async updateRole(roleId: string, updateData: any) {
    const device = await getStoredDeviceInfo();
    return this.api.put(`/admin/roles/${roleId}`, updateData, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async getRoleDepartments(roleId: string) {
    const device = await getStoredDeviceInfo();
    return this.api.get(`/admin/roles/${roleId}/departments`, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async assignDepartmentToRole(roleId: string, deptId: string) {
    const device = await getStoredDeviceInfo();
    return this.api.post(
      `/admin/roles/${roleId}/departments/${deptId}`,
      {},
      { headers: { 'X-Device-ID': device.deviceId } },
    );
  }

  async removeDepartmentFromRole(roleId: string, deptId: string) {
    const device = await getStoredDeviceInfo();
    return this.api.delete(`/admin/roles/${roleId}/departments/${deptId}`, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }

  async deleteRole(roleId: string) {
    const device = await getStoredDeviceInfo();
    return this.api.delete(`/admin/roles/${roleId}`, {
      headers: { 'X-Device-ID': device.deviceId },
    });
  }
}

/* ============================================================
   EXPORT
   ============================================================ */

export const api = ApiService.getInstance();
