import { Resource } from 'src/modules/users/entities';

export interface PermissionMetadata {
  resource: Resource;
  actions: string[];
  match?: 'every' | 'some';
}
