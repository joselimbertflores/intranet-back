import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

import { Resource } from 'src/modules/users/entities';
import { ResourceGuard } from '../guards/resource.guard';

export const RESOURCE_KEY = 'resource';
export function ProtectedResource(resource: Resource) {
  return applyDecorators(SetMetadata(RESOURCE_KEY, resource), UseGuards(ResourceGuard));
}
