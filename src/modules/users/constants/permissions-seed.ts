import { Resource } from '../entities';

export const ADMIN_ROLE_NAME = 'ADMIN';

export const PERMISSIONS_SEED = [
  {
    resource: Resource.USERS,
    actions: ['create', 'read', 'update'],
  },
  {
    resource: Resource.ROLES,
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    resource: Resource.DOCUMENTS,
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    resource: Resource.COMMUNICATIONS,
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    resource: Resource.CALENDAR,
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    resource: Resource.DIRECTORY,
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    resource: Resource.TUTORIALS,
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    resource: Resource.CONTENT,
    actions: ['create', 'read', 'update', 'delete'],
  },
] as const;
