import { Logger } from '@nestjs/common';

import { UsersService } from './users.service';
import type { Role, User } from '../entities';
import type { AccessTokenPayload } from 'src/modules/auth/interfaces';

describe('UsersService', () => {
  const buildService = () => {
    const roleRepository = {
      find: jest.fn(),
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

  it('creates imported Identity Hub users without local isActive', async () => {
    const { service, roleRepository, userRepository, identityHubUsersClient } = buildService();
    const role = { id: 'role-1', name: 'USER' } as Role;

    userRepository.findOne.mockResolvedValue(null);
    roleRepository.findBy.mockResolvedValue([role]);
    identityHubUsersClient.findAssignableUserByExternalKey.mockResolvedValue({
      externalKey: 'IDH-U-1',
      fullName: 'Ada Lovelace',
    });

    await service.importFromIdentity({ externalKey: 'IDH-U-1', roleIds: ['role-1'] });

    expect(roleRepository.find).not.toHaveBeenCalled();
    expect(userRepository.create).toHaveBeenCalledWith({
      externalKey: 'IDH-U-1',
      fullName: 'Ada Lovelace',
      roles: [role],
    });
  });

  it('imports Identity Hub users with only manually selected roles', async () => {
    const { service, roleRepository, userRepository, identityHubUsersClient } = buildService();
    const selectedRole = { id: 'role-selected', name: 'EDITOR', isAutoAssigned: false } as Role;
    const autoAssignedRole = { id: 'role-auto', name: 'Funcionario', isAutoAssigned: true } as Role;

    userRepository.findOne.mockResolvedValue(null);
    roleRepository.findBy.mockResolvedValue([selectedRole]);
    roleRepository.find.mockResolvedValue([autoAssignedRole]);
    identityHubUsersClient.findAssignableUserByExternalKey.mockResolvedValue({
      externalKey: 'IDH-U-9',
      fullName: 'Hedy Lamarr',
    });

    await service.importFromIdentity({ externalKey: 'IDH-U-9', roleIds: ['role-selected'] });

    expect(roleRepository.find).not.toHaveBeenCalled();
    expect(userRepository.create).toHaveBeenCalledWith({
      externalKey: 'IDH-U-9',
      fullName: 'Hedy Lamarr',
      roles: [selectedRole],
    });
  });

  it('updates fullName during sync and preserves local roles', async () => {
    const { service, userRepository, identityHubUsersClient } = buildService();
    const role = { id: 'role-admin', name: 'ADMIN' } as Role;
    const existingUser = {
      id: 'local-user-1',
      externalKey: 'IDH-U-1',
      fullName: 'Old Name',
      roles: [role],
    } as User;
    const payload = {
      externalKey: 'IDH-U-1',
      name: 'Token Name',
    } as AccessTokenPayload;

    userRepository.findOne.mockResolvedValue(existingUser);
    const result = await service.syncUserFromIdentity(payload);

    expect(identityHubUsersClient.findAssignableUserByExternalKey).not.toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalledWith({ id: 'local-user-1' }, { fullName: 'Token Name' });
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(result.roles).toEqual([role]);
  });

  it('does not update an existing shadow user when fullName did not change', async () => {
    const { service, userRepository, identityHubUsersClient } = buildService();
    const role = { id: 'role-admin', name: 'ADMIN' } as Role;
    const existingUser = {
      id: 'local-user-1',
      externalKey: 'IDH-U-1',
      fullName: 'Ada Lovelace',
      roles: [role],
    } as User;
    const payload = {
      externalKey: 'IDH-U-1',
      name: 'Ada Lovelace',
    } as AccessTokenPayload;

    userRepository.findOne.mockResolvedValue(existingUser);

    const result = await service.syncUserFromIdentity(payload);

    expect(identityHubUsersClient.findAssignableUserByExternalKey).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(result.roles).toEqual([role]);
  });

  it('creates JIT shadow users with auto-assigned roles and without local isActive', async () => {
    const { service, roleRepository, userRepository, identityHubUsersClient } = buildService();
    const autoAssignedRole = { id: 'role-base', name: 'Funcionario', isAutoAssigned: true } as Role;
    const payload = {
      externalKey: 'IDH-U-2',
      name: 'Grace Hopper',
    } as AccessTokenPayload;

    userRepository.findOne.mockResolvedValue(null);
    roleRepository.find.mockResolvedValue([autoAssignedRole]);
    await service.syncUserFromIdentity(payload);

    expect(identityHubUsersClient.findAssignableUserByExternalKey).not.toHaveBeenCalled();
    expect(roleRepository.find).toHaveBeenCalledWith({ where: { isAutoAssigned: true } });
    expect(userRepository.create).toHaveBeenCalledWith({
      externalKey: 'IDH-U-2',
      fullName: 'Grace Hopper',
      roles: [autoAssignedRole],
    });
  });

  it('creates JIT shadow users without roles and warns when no auto-assigned roles exist', async () => {
    const { service, roleRepository, userRepository } = buildService();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const payload = {
      externalKey: 'IDH-U-3',
      name: 'Katherine Johnson',
    } as AccessTokenPayload;

    userRepository.findOne.mockResolvedValue(null);
    roleRepository.find.mockResolvedValue([]);

    await service.syncUserFromIdentity(payload);

    expect(userRepository.create).toHaveBeenCalledWith({
      externalKey: 'IDH-U-3',
      fullName: 'Katherine Johnson',
      roles: [],
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'No auto-assigned roles found for new shadow user IDH-U-3. Creating user without roles.',
    );
    warnSpy.mockRestore();
  });

  it('updates local roles without changing other shadow user fields', async () => {
    const { service, roleRepository, userRepository } = buildService();
    const newRole = { id: 'role-2', name: 'EDITOR' } as Role;
    const existingUser = {
      id: 'local-user-1',
      externalKey: 'IDH-U-1',
      fullName: 'Ada Lovelace',
      roles: [],
    } as User;

    userRepository.findOneBy.mockResolvedValue(existingUser);
    roleRepository.findBy.mockResolvedValue([newRole]);

    await service.update('local-user-1', { roleIds: ['role-2'] });

    expect(userRepository.save).toHaveBeenCalledWith({
      ...existingUser,
      roles: [newRole],
    });
  });
});
