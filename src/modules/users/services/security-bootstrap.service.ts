import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { PERMISSIONS_SEED } from '../constants';
import { Permission, Role, User } from '../entities';
import { IdentityHubUsersClientService } from './identity-hub-users-client.service';

const ADMIN_ROLE_NAME = 'ADMIN';

@Injectable()
export class SecurityBootstrapService {
  constructor(
    @InjectRepository(Permission) private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly identityHubUsersClient: IdentityHubUsersClientService,
  ) {}

  async seedPermissions() {
    const permissions = PERMISSIONS_SEED.flatMap(({ resource, actions }) =>
      actions.map((action: string) => ({ resource, action })),
    );

    await this.permissionRepository.upsert(permissions, {
      conflictPaths: ['resource', 'action'],
      skipUpdateIfNoValuesChanged: true,
    });

    return { ok: true, message: 'Permissions seeded successfully' };
  }

  async ensureAdminRole(): Promise<Role> {
    const permissions = await this.permissionRepository.find();

    if (permissions.length === 0) {
      throw new Error('No hay permisos base sembrados. Ejecuta seedPermissions() antes de asegurar el rol ADMIN.');
    }

    const existingRole = await this.roleRepository.findOne({
      where: { name: ADMIN_ROLE_NAME },
      relations: { permissions: true },
    });

    if (existingRole) {
      const existingPermissionIds = new Set((existingRole.permissions ?? []).map((permission) => permission.id));
      const missingPermissions = permissions.filter((permission) => !existingPermissionIds.has(permission.id));

      if (missingPermissions.length === 0) {
        return existingRole;
      }

      existingRole.permissions = [...(existingRole.permissions ?? []), ...missingPermissions];
      return this.roleRepository.save(existingRole);
    }

    const adminRole = this.roleRepository.create({
      name: ADMIN_ROLE_NAME,
      description: 'Administrador local de Intranet',
      permissions,
    });

    return this.roleRepository.save(adminRole);
  }

  async bootstrapInitialAdmin(externalKey: string) {
    await this.seedPermissions();
    const adminRole = await this.ensureAdminRole();

    const hasLocalAdmin = await this.hasLocalAdmin();

    if (hasLocalAdmin) {
      return { status: 'admin-already-exists' as const };
    }

    const existingUser = await this.findLocalUserByExternalKey(externalKey);

    if (existingUser) {
      throw new Error(`El usuario local con externalKey ${externalKey} ya existe y no es ADMIN. No fue promovido.`);
    }

    const identityUser = await this.identityHubUsersClient.findAssignableUserByExternalKey(externalKey);

    if (identityUser.externalKey !== externalKey) {
      throw new Error('El servicio de usuarios devolvio un identificador externo diferente al solicitado.');
    }

    const user = this.userRepository.create({
      externalKey: identityUser.externalKey,
      fullName: identityUser.fullName,
      roles: [adminRole],
      isActive: true,
    });

    try {
      return { status: 'created' as const, user: await this.userRepository.save(user) };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new Error('El usuario ya existe en este cliente.', { cause: error });
      }
      throw error;
    }
  }

  private async hasLocalAdmin(): Promise<boolean> {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.name = :roleName', { roleName: ADMIN_ROLE_NAME })
      .getExists();
  }

  private findLocalUserByExternalKey(externalKey: string) {
    return this.userRepository.findOne({
      where: { externalKey },
      relations: { roles: true },
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;

    const driverError = error.driverError as { code?: string };
    return driverError.code === '23505';
  }
}
