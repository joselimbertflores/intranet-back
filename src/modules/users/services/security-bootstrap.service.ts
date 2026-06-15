import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';

import { Permission, Role, User } from '../entities';
import { PERMISSIONS_SEED } from '../constants';
import type { InitialAdminBootstrapResult } from '../types/security-bootstrap.types';
import { IdentityHubUsersClientService } from './identity-hub-users-client.service';

const ADMIN_ROLE_NAME = 'ADMIN';

type PermissionDefinition = Pick<Permission, 'resource' | 'action'>;

@Injectable()
export class SecurityBootstrapService {
  constructor(
    @InjectRepository(Permission) private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly identityHubUsersClient: IdentityHubUsersClientService,
  ) {}

  private async ensurePermissions(manager?: EntityManager): Promise<void> {
    const permissionRepository = this.getPermissionRepository(manager);
    const permissions = this.getBasePermissionDefinitions();

    await permissionRepository.upsert(permissions, {
      conflictPaths: ['resource', 'action'],
      skipUpdateIfNoValuesChanged: true,
    });
  }

  private async ensureAdminRole(manager?: EntityManager): Promise<Role> {
    const permissionRepository = this.getPermissionRepository(manager);
    const roleRepository = this.getRoleRepository(manager);
    const permissions = await permissionRepository.find();

    if (permissions.length === 0) {
      throw new Error('No hay permisos base sembrados. Ejecuta ensurePermissions() antes de asegurar el rol ADMIN.');
    }

    const existingRole = await roleRepository.findOne({
      where: { name: ADMIN_ROLE_NAME },
      relations: { permissions: true },
    });

    if (existingRole) {
      const existingPermissionIds = new Set((existingRole.permissions ?? []).map((permission) => permission.id));
      const missingPermissions = permissions.filter((permission) => !existingPermissionIds.has(permission.id));
      const mustDisableAutoAssignment = existingRole.isAutoAssigned;

      if (missingPermissions.length === 0 && !mustDisableAutoAssignment) {
        return existingRole;
      }

      existingRole.isAutoAssigned = false;
      existingRole.permissions = [...(existingRole.permissions ?? []), ...missingPermissions];

      return roleRepository.save(existingRole);
    }

    const adminRole = roleRepository.create({
      name: ADMIN_ROLE_NAME,
      description: 'Administrador local de Intranet',
      isAutoAssigned: false,
      permissions,
    });

    return roleRepository.save(adminRole);
  }

  async bootstrapInitialAdmin(externalKey: string): Promise<InitialAdminBootstrapResult> {
    const localBootstrap = await this.dataSource.transaction(async (manager) => {
      await this.ensurePermissions(manager);
      await this.ensureAdminRole(manager);

      if (await this.hasLocalAdmin(manager)) {
        return { status: 'admin-already-exists' as const };
      }

      const existingUser = await this.findLocalUserByExternalKey(externalKey, manager);

      if (existingUser) {
        throw new Error('El usuario local indicado ya existe y no es ADMIN. No fue promovido.');
      }

      return { status: 'needs-admin' as const };
    });

    if (localBootstrap.status === 'admin-already-exists') {
      return localBootstrap;
    }

    const identityUser = await this.identityHubUsersClient.findAssignableUserByExternalKey(externalKey);

    if (identityUser.externalKey !== externalKey) {
      throw new Error('El servicio de usuarios devolvio un identificador externo diferente al solicitado.');
    }

    return this.dataSource.transaction(async (manager) => {
      if (await this.hasLocalAdmin(manager)) {
        return { status: 'admin-already-exists' as const };
      }

      const existingUser = await this.findLocalUserByExternalKey(externalKey, manager);

      if (existingUser) {
        throw new Error('El usuario local indicado ya existe y no es ADMIN. No fue promovido.');
      }

      const adminRole = await this.ensureAdminRole(manager);
      const user = manager.getRepository(User).create({
        externalKey: identityUser.externalKey,
        fullName: identityUser.fullName,
        roles: [adminRole],
      });

      try {
        return {
          status: 'created' as const,
          user: await manager.getRepository(User).save(user),
        };
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          throw new Error('El usuario ya existe en este cliente.', { cause: error });
        }
        throw error;
      }
    });
  }

  private async hasLocalAdmin(manager?: EntityManager): Promise<boolean> {
    return this.getUserRepository(manager)
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.name = :roleName', { roleName: ADMIN_ROLE_NAME })
      .getExists();
  }

  private findLocalUserByExternalKey(externalKey: string, manager?: EntityManager) {
    return this.getUserRepository(manager).findOne({
      where: { externalKey },
      relations: { roles: true },
    });
  }

  private getBasePermissionDefinitions(): PermissionDefinition[] {
    const permissions = PERMISSIONS_SEED.flatMap(({ resource, actions }) =>
      actions.map((action: string) => ({ resource, action })),
    );
    const uniquePermissions = new Map<string, PermissionDefinition>();

    for (const permission of permissions) {
      uniquePermissions.set(this.getPermissionKey(permission), permission);
    }

    return [...uniquePermissions.values()];
  }

  private getPermissionKey(permission: PermissionDefinition): string {
    return `${permission.resource}:${permission.action}`;
  }

  private getPermissionRepository(manager?: EntityManager): Repository<Permission> {
    return manager?.getRepository(Permission) ?? this.permissionRepository;
  }

  private getRoleRepository(manager?: EntityManager): Repository<Role> {
    return manager?.getRepository(Role) ?? this.roleRepository;
  }

  private getUserRepository(manager?: EntityManager): Repository<User> {
    return manager?.getRepository(User) ?? this.userRepository;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;

    const driverError = error.driverError as { code?: string };
    return driverError.code === '23505';
  }
}
