import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { PermissionMetadata } from '../interfaces';
import { PermissionsGuard } from '../guards/permissions.guard';

export const PERMISSION_KEY = 'permission';
export function RequirePermission(properties: PermissionMetadata) {
  return applyDecorators(SetMetadata(PERMISSION_KEY, properties), UseGuards(PermissionsGuard));
}
