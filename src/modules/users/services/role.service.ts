import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';

import { CreateRoleDto, UpdateRoleDto } from '../dtos';
import { PaginationDto } from 'src/modules/common';
import { Permission, Role } from '../entities';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Permission) private permissionRepository: Repository<Permission>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
  ) {}

  async create(roleDto: CreateRoleDto) {
    const { permissionIds, ...toCreateProps } = roleDto;

    const permissions = await this.permissionRepository.find({ where: { id: In(permissionIds) } });

    if (permissions.length !== permissionIds.length) {
      const invalid = permissionIds.filter((id) => !permissions.some((perm) => perm.id === id));
      throw new BadRequestException(`Invalid permission: ${invalid.join(', ')}`);
    }

    const role = this.roleRepository.create({
      ...toCreateProps,
      permissions,
    });

    return await this.roleRepository.save(role);
  }

  async update(id: string, roleDto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role with id ${id} not found`);

    if (roleDto.permissionIds !== undefined) {
      const newPermissions = await this.permissionRepository.findBy({
        id: In(roleDto.permissionIds),
      });
      role.permissions = newPermissions;
    }
    return await this.roleRepository.save({ ...role, ...roleDto });
  }

  async getGroupedPermissions() {
    const permissions = await this.permissionRepository.find();
    const grouped = permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.resource]) {
          acc[perm.resource] = [];
        }
        acc[perm.resource].push({
          id: perm.id,
          action: perm.action,
        });
        return acc;
      },
      {} as Record<string, { id: string; action: string }[]>,
    );

    return Object.entries(grouped).map(([resource, actions]) => ({
      resource,
      actions,
    }));
  }

  async findAll(paginatioDto: PaginationDto) {
    const { limit, offset, term } = paginatioDto;
    const [roles, total] = await this.roleRepository.findAndCount({
      relations: { permissions: true },
      skip: offset,
      take: limit,
      ...(term && {
        where: {
          name: ILike(`%${term}%`),
        },
      }),
      order: {
        createdAt: 'DESC',
      },
    });
    return { roles, total };
  }

  async getRolesToUser() {
    return this.roleRepository.find({ select: { name: true, id: true, description: true } });
  }
}
