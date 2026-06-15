import { SecurityBootstrapService } from './security-bootstrap.service';
import type { Permission, Role } from '../entities';

describe('SecurityBootstrapService', () => {
  const buildService = () => {
    const permissionRepository = {
      find: jest.fn(),
      upsert: jest.fn(),
    };
    const roleRepository = {
      count: jest.fn(),
      create: jest.fn((value) => value),
      findOne: jest.fn(),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const userRepository = {};
    const dataSource = {};
    const identityHubUsersClient = {};

    const service = new SecurityBootstrapService(
      permissionRepository as any,
      roleRepository as any,
      userRepository as any,
      dataSource as any,
      identityHubUsersClient as any,
    );

    return { service, permissionRepository, roleRepository };
  };

  it('creates the ADMIN seed role with all base permissions and isAutoAssigned false', async () => {
    const { service, permissionRepository, roleRepository } = buildService();
    const permissions = [
      { id: 1, resource: 'users', action: 'read' },
      { id: 2, resource: 'roles', action: 'update' },
    ] as Permission[];

    permissionRepository.find.mockResolvedValue(permissions);
    roleRepository.findOne.mockResolvedValue(null);

    await service.ensureAdminRole();

    expect(roleRepository.create).toHaveBeenCalledWith({
      name: 'ADMIN',
      description: 'Administrador local de Intranet',
      isAutoAssigned: false,
      permissions,
    });
    expect(roleRepository.save).toHaveBeenCalledWith({
      name: 'ADMIN',
      description: 'Administrador local de Intranet',
      isAutoAssigned: false,
      permissions,
    });
  });

  it('forces an existing ADMIN role to remain non-auto-assigned', async () => {
    const { service, permissionRepository, roleRepository } = buildService();
    const permissions = [
      { id: 1, resource: 'users', action: 'read' },
      { id: 2, resource: 'roles', action: 'update' },
    ] as Permission[];
    const existingAdminRole = {
      id: 'role-admin',
      name: 'ADMIN',
      isAutoAssigned: true,
      permissions: [permissions[0]],
    } as Role;

    permissionRepository.find.mockResolvedValue(permissions);
    roleRepository.findOne.mockResolvedValue(existingAdminRole);

    const result = await service.ensureAdminRole();

    expect(roleRepository.save).toHaveBeenCalledWith({
      ...existingAdminRole,
      isAutoAssigned: false,
      permissions,
    });
    expect(result.role.isAutoAssigned).toBe(false);
    expect(result.addedPermissions).toBe(1);
  });
});
