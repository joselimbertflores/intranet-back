import type { Role, User } from '../entities';

export interface PermissionSyncResult {
  totalBasePermissions: number;
  createdPermissions: number;
  existingPermissions: number;
}

export interface AdminRoleSyncResult {
  createdRole: boolean;
  totalPermissions: number;
  addedPermissions: number;
}

export interface AdminRoleEnsureResult extends AdminRoleSyncResult {
  role: Role;
}

export interface BaseRolesSyncResult {
  roleName: string;
  createdRole: boolean;
  markedAutoAssigned: boolean;
  totalAutoAssignedRoles: number;
}

export type InitialAdminBootstrapResult =
  | {
      status: 'admin-already-exists';
      permissions: PermissionSyncResult;
      adminRole: AdminRoleEnsureResult;
      autoAssignedRoles: BaseRolesSyncResult;
    }
  | {
      status: 'created';
      permissions: PermissionSyncResult;
      adminRole: AdminRoleEnsureResult;
      autoAssignedRoles: BaseRolesSyncResult;
      user: User;
    };
