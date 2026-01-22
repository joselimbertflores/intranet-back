import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';

import { AccessTokenPayload } from 'src/modules/auth/interfaces';
import { Permission, Role, User } from '../entities';
import { PaginationParamsDto } from 'src/modules/common';
import { PERMISSIONS_SEED } from '../constants';
import { UpdateUserDto } from '../dtos';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Permission) private permissionRepository: Repository<Permission>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async executePermissionsSeed() {
    const permissions = PERMISSIONS_SEED.map(({ resource, actions }) =>
      actions.map((action) => ({ resource, action })),
    ).flat();
    await this.permissionRepository.save(permissions);
    return { ok: true, message: 'Permissions seeded successfully' };
  }

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

  async syncUserFromIdentity(payload: AccessTokenPayload, defaultRole?: string) {
    const role = defaultRole ? await this.roleRepository.findOneBy({ name: defaultRole }) : null;
    const externalKey = payload.externalKey;
    let user = await this.userRepository.findOne({ where: { externalKey } });
    if (!user) {
      user = this.userRepository.create({
        fullName: payload.name,
        ...(role && { roles: [role] }),
        externalKey,
      });
      return await this.userRepository.save(user);
    }
    return user;
  }
}
