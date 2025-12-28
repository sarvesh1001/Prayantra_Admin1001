export interface AdminAuthResponse {
    success: boolean;
    data: {
      user_exists: boolean;
      has_mpin: boolean;
      mpin_locked: boolean;
      device_trusted: boolean;
      flow_state: string;
      message: string;
      user_id: string;
    };
    message: string;
    timestamp: string;
  }
  
  export interface OTPVerifyResponse {
    success: boolean;
    data: {
      admin_id: string;
      daily_quota: {
        limit: number;
        remaining: number;
        used: number;
      };
      device_trusted: boolean;
      has_mpin: boolean;
      message: string;
      mpin_locked: boolean;
    };
    message: string;
    timestamp: string;
  }
  
  export interface MPINVerifyResponse {
    success: boolean;
    data: {
      admin: AdminInfo;
      message: string;
      tokens: AuthTokens;
    };
    message: string;
    timestamp: string;
  }
  
  export interface AdminInfo {
    admin_id: string;
    departments: string[];
    full_name: string;
    is_active: boolean;
    permissions: string[];
    role_string: string;
    role_type: number;
    username: string;
  }
  
  export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }
  
  export interface DeviceInfo {
    deviceId: string;
    deviceFingerprint: string;
    userAgent: string;
    biometricType: string;
    isBiometricSupported: boolean;
    secureStorageAvailable: boolean;
  }
  
  export interface ApiError {
    success: boolean;
    error?: string;
    message: string;
    timestamp: string;
    retry_after?: number;
    expires_at?: string;
  }
  
  export type LoginFlowState = 
    | 'existing_user_mpin'
    | 'new_user_no_mpin'
    | 'device_not_trusted'
    | 'mpin_locked';
  
  export interface DailyQuota {
    limit: number;
    remaining: number;
    used: number;
  }
  
  export interface AxiosErrorResponse {
    response?: {
      status: number;
      data: ApiError;
      config?: {
        data?: string;
      };
    };
  }