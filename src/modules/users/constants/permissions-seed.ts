import { Resource } from '../entities';

export const PERMISSIONS_SEED = [
  {
    resource: Resource.COMMUNICATIONS,
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    resource: Resource.USERS,
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    resource: Resource.DOCUMENTS,
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
];
