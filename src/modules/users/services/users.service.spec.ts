import { UsersService } from './users.service';
import type { Role, User } from '../entities';
import type { AccessTokenPayload } from 'src/modules/auth/interfaces';

describe('UsersService', () => {
  const buildService = () => {
    const roleRepository = {
      findBy: jest.fn(),
    };
    const userRepository = {
      create: jest.fn((value) => value),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn((value) => Promise.resolve(value)),
      update: jest.fn(() => Promise.resolve({ affected: 1 })),
    };
    const identityHubUsersClient = {
      findAssignableUserByExternalKey: jest.fn(),
      searchAssignableUsers: jest.fn(),
    };

    const service = new UsersService(roleRepository as any, userRepository as any, identityHubUsersClient as any);

    return { service, roleRepository, userRepository, identityHubUsersClient };
  };

  it('creates imported Identity Hub users as locally active by default', async () => {
    const { service, roleRepository, userRepository, identityHubUsersClient } = buildService();
    const role = { id: 'role-1', name: 'USER' } as Role;

    userRepository.findOne.mockResolvedValue(null);
    roleRepository.findBy.mockResolvedValue([role]);
    identityHubUsersClient.findAssignableUserByExternalKey.mockResolvedValue({
      externalKey: 'IDH-U-1',
      fullName: 'Ada Lovelace',
    });

    await service.importFromIdentity({ externalKey: 'IDH-U-1', roleIds: ['role-1'] });

    expect(userRepository.create).toHaveBeenCalledWith({
      externalKey: 'IDH-U-1',
      fullName: 'Ada Lovelace',
      isActive: true,
      roles: [role],
    });
  });

  it('updates only basic identity data during sync and preserves local roles and isActive', async () => {
    const { service, userRepository, identityHubUsersClient } = buildService();
    const role = { id: 'role-admin', name: 'ADMIN' } as Role;
    const existingUser = {
      id: 'local-user-1',
      externalKey: 'IDH-U-1',
      fullName: 'Old Name',
      isActive: false,
      roles: [role],
    } as User;
    const payload = {
      externalKey: 'IDH-U-1',
      name: 'Token Name',
    } as AccessTokenPayload;

    userRepository.findOne.mockResolvedValue(existingUser);
    identityHubUsersClient.findAssignableUserByExternalKey.mockResolvedValue({
      externalKey: 'IDH-U-1',
      fullName: 'New Name',
    });

    const result = await service.syncUserFromIdentity(payload);

    expect(userRepository.update).toHaveBeenCalledWith({ id: 'local-user-1' }, { fullName: 'New Name' });
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(result.isActive).toBe(false);
    expect(result.roles).toEqual([role]);
  });

  it('creates JIT shadow users as locally active without assigning roles', async () => {
    const { service, userRepository, identityHubUsersClient } = buildService();
    const payload = {
      externalKey: 'IDH-U-2',
      name: 'Grace Hopper',
    } as AccessTokenPayload;

    userRepository.findOne.mockResolvedValue(null);
    identityHubUsersClient.findAssignableUserByExternalKey.mockResolvedValue({
      externalKey: 'IDH-U-2',
      fullName: 'Grace Hopper',
    });

    await service.syncUserFromIdentity(payload);

    expect(userRepository.create).toHaveBeenCalledWith({
      externalKey: 'IDH-U-2',
      fullName: 'Grace Hopper',
      isActive: true,
      roles: [],
    });
  });

  it('updates local active state without requiring role changes', async () => {
    const { service, userRepository } = buildService();
    const existingUser = {
      id: 'local-user-1',
      externalKey: 'IDH-U-1',
      fullName: 'Ada Lovelace',
      isActive: true,
      roles: [],
    } as User;

    userRepository.findOneBy.mockResolvedValue(existingUser);

    await service.update('local-user-1', { isActive: false });

    expect(userRepository.save).toHaveBeenCalledWith({
      ...existingUser,
      isActive: false,
    });
  });
});
