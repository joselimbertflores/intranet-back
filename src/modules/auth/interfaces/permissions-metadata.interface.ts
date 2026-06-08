import { Resource } from 'src/modules/users/entities';

export interface PermissionsMetadata {
  resource: Resource;
  actions: string[];
  match?: 'every' | 'some';
}
