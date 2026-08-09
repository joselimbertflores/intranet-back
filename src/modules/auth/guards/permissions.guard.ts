import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { User } from 'src/modules/users/entities';
import { PermissionsMetadata } from '../interfaces/permissions-metadata.interface';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.get<PermissionsMetadata>(PERMISSIONS_KEY, context.getHandler());

    if (!metadata) return true;

    const request: Express.Request = context.switchToHttp().getRequest();
    const user = request['user'] as User | undefined;
    if (!user) throw new UnauthorizedException('Authentication required');

    const { resource, actions, match = 'some' } = metadata;

    const permissions = (user.roles ?? []).flatMap((role) => role.permissions ?? []);

    const hasRequiredActions =
      match === 'every'
        ? actions.every((action) => permissions.some((perm) => perm.resource === resource && perm.action === action))
        : actions.some((action) => permissions.some((perm) => perm.resource === resource && perm.action === action));

    if (!hasRequiredActions) {
      const mode = match === 'some' ? 'one of' : 'all of';

      throw new ForbiddenException(`Access denied: Missing required actions (${mode}): ${actions.join(', ')}`);
    }

    return true;
  }
}
