import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';

import type { PaginationParamsDto } from 'src/modules/common';
import { UpdateUserDto } from '../dtos';
import { Role, User } from '../entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
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

    let newRoles: Role[] | undefined;

    if (roleIds) {
      newRoles = await this.resolveRoles(roleIds);
    }

    return await this.userRepository.save({
      ...userDB,
      ...(newRoles && { roles: newRoles }),
    });
  }

  async findByExternalKey(externalKey: string) {
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
}
