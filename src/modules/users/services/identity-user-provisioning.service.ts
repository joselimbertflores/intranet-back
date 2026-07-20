import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';

import type { AccessTokenPayload } from 'src/modules/auth/interfaces';

import { ImportUserFromIdentityDto } from '../dtos';
import { Role, User } from '../entities';
import { IdentityHubUsersClientService } from './identity-hub-users-client.service';

@Injectable()
export class IdentityUserProvisioningService {
  private readonly logger = new Logger(IdentityUserProvisioningService.name);

  constructor(
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly identityHubUsersClient: IdentityHubUsersClientService,
  ) {}

  async importFromIdentity(dto: ImportUserFromIdentityDto) {
    await this.ensureExternalKeyIsAvailable(dto.externalKey);

    const identityUser = await this.identityHubUsersClient.findAssignableUserByExternalKey(dto.externalKey);
    const roles = dto.roleIds ? await this.resolveRoles(dto.roleIds) : [];
    const user = this.userRepository.create({
      externalKey: identityUser.externalKey,
      fullName: identityUser.fullName,
      roles,
    });

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('El usuario ya existe en este cliente.');
      }
      throw error;
    }
  }

  async syncUserFromIdentity(payload: AccessTokenPayload) {
    const externalKey = payload.externalKey;
    let user = await this.findByExternalKey(externalKey);

    if (!user) {
      return this.createShadowUser(payload);
    }

    const fullName = payload.name;
    if (fullName && user.fullName !== fullName) {
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

  private async createShadowUser(payload: AccessTokenPayload) {
    const externalKey = payload.externalKey;
    const autoAssignedRoles = await this.roleRepository.find({ where: { isAutoAssigned: true } });

    if (autoAssignedRoles.length === 0) {
      this.logger.warn(`No auto-assigned roles found for new shadow user ${externalKey}. Creating user without roles.`);
    }

    const user = this.userRepository.create({
      fullName: payload.name,
      externalKey,
      roles: autoAssignedRoles,
    });

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;

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

  private async resolveRoles(roleIds: string[]) {
    const roles = await this.roleRepository.findBy({ id: In(roleIds) });

    if (roles.length !== roleIds.length) {
      const invalid = roleIds.filter((id) => !roles.some((role) => role.id === id));
      throw new BadRequestException(`Invalid roles: ${invalid.join(', ')}`);
    }

    return roles;
  }

  private async ensureExternalKeyIsAvailable(externalKey: string) {
    const existingUser = await this.userRepository.findOne({ where: { externalKey } });

    if (existingUser) {
      throw new ConflictException('El usuario ya existe en este cliente.');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;

    const driverError = error.driverError as { code?: string };
    return driverError.code === '23505';
  }
}
