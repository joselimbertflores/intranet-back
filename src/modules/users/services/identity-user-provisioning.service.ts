import { BadGatewayException, ConflictException, Injectable, Logger } from '@nestjs/common';
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

    if (identityUser.externalKey !== dto.externalKey) {
      throw new BadGatewayException('Identity Hub returned a different external key for the requested user');
    }

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

    return this.syncExistingUserFullName(user, fullName);
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

      // Another SSO callback or an administrative import may have created the shadow user.
      const existingUser = await this.findByExternalKey(externalKey);
      if (existingUser) return this.syncExistingUserFullName(existingUser, fullName);

      throw error;
    }
  }

  private async syncExistingUserFullName(user: User, fullName: string): Promise<User> {
    if (user.fullName !== fullName) {
      await this.userRepository.update({ id: user.id }, { fullName });
      user.fullName = fullName;
    }

    return user;
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

    const driverError = error.driverError as { code?: string; constraint?: string };
    const externalKeyConstraint = this.userRepository.metadata.uniques.find(
      (unique) => unique.columns.length === 1 && unique.columns[0].propertyName === 'externalKey',
    );

    return driverError.code === '23505' && driverError.constraint === externalKeyConstraint?.name;
  }
}
