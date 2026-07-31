import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { ImportUserFromIdentityDto, UserResponseDto } from '../dtos';
import { Role, User } from '../entities';
import { IdentityHubUsersClientService } from './identity-hub-users-client.service';
import { RolesService } from './roles.service';

interface IdentityUserProjection {
  externalKey: string;
  fullName: string;
}

@Injectable()
export class IdentityUserProvisioningService {
  private readonly logger = new Logger(IdentityUserProvisioningService.name);

  constructor(
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private identityHubUsersClient: IdentityHubUsersClientService,
    private rolesService: RolesService,
  ) {}

  async importFromIdentity(dto: ImportUserFromIdentityDto): Promise<UserResponseDto> {
    await this.ensureExternalKeyIsAvailable(dto.externalKey);

    const identityUser = await this.identityHubUsersClient.findAssignableUserByExternalKey(dto.externalKey);
    const roles = await this.rolesService.resolveRolesByIds(dto.roleIds ?? []);
    const user = this.userRepository.create({
      externalKey: identityUser.externalKey,
      fullName: identityUser.fullName,
      roles,
    });

    try {
      return new UserResponseDto(await this.userRepository.save(user));
    } catch (error) {
      if (this.isExternalKeyUniqueViolation(error)) {
        throw new ConflictException(`Identity Hub user with external key ${dto.externalKey} is already registered`);
      }
      throw error;
    }
  }

  async syncUserFromIdentity(identityUser: IdentityUserProjection) {
    const { externalKey, fullName } = identityUser;
    const user = await this.findByExternalKey(externalKey);

    if (!user) {
      return this.createShadowUser(identityUser);
    }

    if (user.fullName !== fullName) {
      await this.userRepository.update({ id: user.id }, { fullName });
      user.fullName = fullName;
    }

    return user;
  }

  searchIdentityCandidates(term: string) {
    return this.identityHubUsersClient.searchAssignableUsers(term);
  }

  findIdentityCandidateByExternalKey(externalKey: string) {
    return this.identityHubUsersClient.findAssignableUserByExternalKey(externalKey);
  }

  private async createShadowUser(identityUser: IdentityUserProjection) {
    const { externalKey, fullName } = identityUser;
    const autoAssignedRoles = await this.roleRepository.find({ where: { isAutoAssigned: true } });

    if (autoAssignedRoles.length === 0) {
      this.logger.warn(`No auto-assigned roles found for new shadow user ${externalKey}. Creating user without roles.`);
    }

    const user = this.userRepository.create({
      fullName,
      externalKey,
      roles: autoAssignedRoles,
    });

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (!this.isExternalKeyUniqueViolation(error)) throw error;

      // * Another concurrent SSO callback may have created the shadow user.
      const existingUser = await this.findByExternalKey(externalKey);
      if (existingUser) return existingUser;

      throw error;
    }
  }

  private findByExternalKey(externalKey: string) {
    return this.userRepository.findOne({
      where: { externalKey },
      relations: { roles: { permissions: true } },
    });
  }

  private async ensureExternalKeyIsAvailable(externalKey: string) {
    const existingUser = await this.userRepository.findOne({ where: { externalKey } });

    if (existingUser) {
      throw new ConflictException(`Identity Hub user with external key ${externalKey} is already registered`);
    }
  }

  private isExternalKeyUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;

    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return driverError.code === '23505' && driverError.constraint === 'uq_users_external_key';
  }
}
