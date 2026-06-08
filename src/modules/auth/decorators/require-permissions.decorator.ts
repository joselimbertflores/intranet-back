import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { PermissionsMetadata } from '../interfaces';
import { PermissionsGuard } from '../guards/permissions.guard';

export const PERMISSIONS_KEY = 'permissions';
export function RequirePermissions(metadata: PermissionsMetadata) {
  return applyDecorators(SetMetadata(PERMISSIONS_KEY, metadata), UseGuards(PermissionsGuard));
}
