export interface Role {
    admin_role_id: string;
    role_name: string;
    role_level: number;
    role_type: number;
    is_system_role: boolean;
    description: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface RoleResponse {
    success: boolean;
    data: {
      meta: {
        count: number;
        role_type?: string | number;
        limit?: number;
        offset?: number;
        total?: number;
      };
      roles: Role[];
    };
    message: string;
    timestamp: string;
  }
  
  export interface SingleRoleResponse {
    success: boolean;
    data: Role;
    message: string;
    timestamp: string;
  }
  
  export interface Department {
    system_department_id: string;
    name: string;
    module_code: string;
    description: string;
    bitmask: number;
  }
  
  export interface Permission {
    permission_id: string;
    permission_name: string;
    description: string;
    category: string;
    module: string;
    scope: string;
    requires_tier: string;
    bit_index: number;
    created_at: string;
  }
  
  export interface RoleDetailsResponse {
    success: boolean;
    data: {
      departments: Department[];
      permissions: Permission[];
      role: Role;
    };
    message: string;
    timestamp: string;
  }
  
  export interface DepartmentPermissions {
    department_name: string;
    permissions: string[];
  }
  
  export interface CreateEmployeeRoleRequest {
    role_name: string;
    department_permissions: DepartmentPermissions[];
    description: string;
  }
  
  export interface CreateManagerRoleRequest {
    role_name: string;
    department_names: string[];
    description: string;
  }
  
  export interface UpdateRoleRequest {
    role_name?: string;
    description?: string;
    add_departments?: string[];
    remove_departments?: string[];
    add_permissions?: string[];
    remove_permissions?: string[];
    replace_permissions?: string[];
  }
  export interface AdminRoleDetailsResponse {
    success: boolean;
    data: {
      departments: Department[];
      permissions: Permission[];
      role: Role;
    };
    message: string;
    timestamp: string;
  }
  
  export interface RoleDetails {
    departments: Department[];
    permissions: Permission[];
    role: Role;
  }