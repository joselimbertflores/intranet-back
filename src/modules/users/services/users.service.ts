import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import type { PaginationParamsDto } from 'src/common/dtos';
import { UpdateUserDto, UserResponseDto, UsersPageResponseDto } from '../dtos';
import { User } from '../entities';
import { RolesService } from './roles.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly rolesService: RolesService,
  ) {}

  async findAll({ limit, offset, term }: PaginationParamsDto): Promise<UsersPageResponseDto> {
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
    return { users: users.map((user) => new UserResponseDto(user)), total };
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    user.roles = await this.rolesService.resolveRolesByIds(dto.roleIds);
    return new UserResponseDto(await this.userRepository.save(user));
  }

  async findByExternalKey(externalKey: string) {
    return this.userRepository.findOne({
      where: { externalKey },
      relations: { roles: { permissions: true } },
    });
  }
}
