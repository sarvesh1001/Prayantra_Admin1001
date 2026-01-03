export * from './role.js'
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
    // types/admin.ts

  export interface Admin {
    admin_id: string;
    username: string;
    full_name: string;
    phone_hash: string;
    role_name: string;
    admin_role_id: string;
    role_type: number;
    is_active: boolean;
    last_login: string;
    admin_created_at: string;
    reports_to?: string;
    reports_to_name?: string;
    relevance_score?: number;
    match_type?: string;
  }

  export interface AdminDetails {
    admin: {
      admin_id: string;
      phone_hash: string;
      phone_encrypted: string;
      phone_key_id: string;
      phone_encrypted_dek: string;
      admin_role_id: string;
      role_type: number;
      admin_created_at: string;
      admin_created_by: string;
      admin_updated_at: string;
      is_active: boolean;
      data_access_scope: string[] | null;
      ip_whitelist: string[] | null;
      failed_login_attempts: number;
      last_login: string;
      username: string;
      full_name: string;
    };
    department_names: string[];
    permission_names: string[];
  }

  export interface CreateAdminRequest {
    phone_number: string;
    username: string;
    full_name: string;
    admin_role_id: string;
    reports_to?: string;
  }

  export interface UpdateAdminRequest {
    username?: string;
    full_name?: string;
    admin_role_id?: string;
    reports_to?: string;
  }

  export interface AdminStats {
    active_admins: number;
    admins_employee: number;
    admins_manager: number;
    admins_super_admin: number;
    admins_with_reports_to: number;
    admins_without_reports_to: number;
    search_enabled: boolean;
    total_admins: number;
  }

  export interface AdminHierarchy {
    admin_id: string;
    username: string;
    full_name: string;
    role_type: number;
    reports_to: string;
    level: number;
    is_active: boolean;
  }

  export interface AdminPhoneInfo {
    access_timestamp: string;
    accessed_by: string;
    admin_id: string;
    masked_phone: string;
    phone_number: string;
  }

  // Response types
  export interface AdminsResponse {
    success: boolean;
    data: {
      admins: Admin[];
      meta: {
        count: number;
        limit: number;
        offset: number;
        total: number;
      };
    };
    message: string;
    timestamp: string;
  }

  export interface AdminResponse {
    success: boolean;
    data: Admin;
    message: string;
    timestamp: string;
  }

  export interface AdminDetailsResponse {
    success: boolean;
    data: AdminDetails;
    message: string;
    timestamp: string;
  }

  export interface AdminStatsResponse {
    success: boolean;
    data: AdminStats;
    message: string;
    timestamp: string;
  }

  export interface AdminHierarchyResponse {
    success: boolean;
    data: AdminHierarchy[];
    message: string;
    timestamp: string;
  }

  export interface AdminPhoneResponse {
    success: boolean;
    data: AdminPhoneInfo;
    message: string;
    timestamp: string;
  }

  export interface AvailableManagersResponse {
    success: boolean;
    data: Admin[];
    message: string;
    timestamp: string;
  }