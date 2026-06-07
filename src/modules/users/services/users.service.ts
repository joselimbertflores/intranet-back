import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, QueryFailedError, Repository } from 'typeorm';

import { AccessTokenPayload } from 'src/modules/auth/interfaces';
import { PaginationParamsDto } from 'src/modules/common';
import { Role, User } from '../entities';
import { ImportUserFromIdentityDto, UpdateUserDto } from '../dtos';
import { IdentityHubUsersClientService } from './identity-hub-users-client.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly identityHubUsersClient: IdentityHubUsersClientService,
  ) {}

  async findAll({ limit, offset, term }: PaginationParamsDto) {
    const [users, total] = await this.userRepository.findAndCount({
      take: limit,
      skip: offset,
      ...(term && {
        where: { fullName: ILike(`%${term}%`) },
      }),
      relations: { roles: true },
      order: {
        createdAt: 'DESC',
      },
    });
    return { users, total };
  }

  async update(id: string, dto: UpdateUserDto) {
    const { roleIds } = dto;
    const userDB = await this.userRepository.findOneBy({ id });

    if (!userDB) throw new NotFoundException(`El usuario editado no existe`);

    const newRoles = await this.roleRepository.findBy({ id: In(roleIds) });

    if (newRoles.length !== roleIds.length) {
      const invalid = roleIds.filter((id) => !newRoles.some((role) => role.id === id));
      throw new BadRequestException(`Invalid roles: ${invalid.join(', ')}`);
    }

    return await this.userRepository.save({ ...userDB, roles: newRoles });
  }

  async findByExternalKey(externalKey: string) {
    return this.userRepository.findOne({
      where: { externalKey },
      relations: { roles: { permissions: true } },
    });
  }

  searchIdentityCandidates(term: string) {
    return this.identityHubUsersClient.searchAssignableUsers(term);
  }

  findIdentityCandidateByExternalKey(externalKey: string) {
    return this.identityHubUsersClient.findAssignableUserByExternalKey(externalKey);
  }

  async importFromIdentity(dto: ImportUserFromIdentityDto) {
    await this.ensureExternalKeyIsAvailable(dto.externalKey);

    const identityUser = await this.identityHubUsersClient.findAssignableUserByExternalKey(dto.externalKey);

    if (identityUser.externalKey !== dto.externalKey) {
      throw new BadGatewayException(
        'El servicio de usuarios devolvio un identificador externo diferente al solicitado.',
      );
    }

    const roles = dto.roleIds ? await this.resolveRoles(dto.roleIds) : [];
    const user = this.userRepository.create({
      externalKey: identityUser.externalKey,
      fullName: identityUser.fullName,
      roles,
      isActive: true,
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
    const identityUser = await this.identityHubUsersClient.findAssignableUserByExternalKey(externalKey);

    if (identityUser.externalKey !== externalKey) {
      throw new BadGatewayException(
        'El servicio de usuarios devolvio un identificador externo diferente al solicitado.',
      );
    }

    if (!user) {
      user = this.userRepository.create({
        fullName: identityUser.fullName || payload.name,
        externalKey,
        roles: [],
        isActive: true,
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

    const fullName = identityUser.fullName || payload.name;
    if (fullName && user.fullName !== fullName) {
      user.fullName = fullName;
      return await this.userRepository.save(user);
    }

    return user;
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
