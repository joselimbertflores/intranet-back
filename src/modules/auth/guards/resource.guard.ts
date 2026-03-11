import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { Resource, User } from 'src/modules/users/entities';
import { RESOURCE_KEY } from '../decorators/protected-resource.decorator';

const methodToActionMap: Record<string, string> = {
  PATCH: 'update',
  POST: 'create',
  GET: 'read',
  PUT: 'update',
  DELETE: 'delete',
};

@Injectable()
export class ResourceGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const resource = this.reflector.get<Resource>(RESOURCE_KEY, context.getClass());

    if (!resource) return true;

    const req: Request = context.switchToHttp().getRequest();
    const user = req.user as User | undefined;
    if (!user) throw new InternalServerErrorException('User not authenticated');

    const action = methodToActionMap[req.method];

    if (!action) return true;

    const permissions = user.roles.flatMap((role) => role.permissions);

    const hasPermission = permissions.some((perm) => perm.resource === resource && perm.action === action);

    if (!hasPermission) {
      throw new ForbiddenException(`Access denied: Missing required action: ${action} on resource: ${resource}`);
    }

    return true;
  }
}
