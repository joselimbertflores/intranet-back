import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, QueryFailedError, Repository } from 'typeorm';

import { PaginationParamsDto } from 'src/common/dtos';
import { CreateRoleDto, RoleOptionResponseDto, RoleResponseDto, RolesPageResponseDto, UpdateRoleDto } from '../dtos';
import { Permission, Role } from '../entities';
import { ADMIN_ROLE_NAME } from '../constants';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Permission) private permissionRepository: Repository<Permission>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
  ) {}

  async findAll(paginationDto: PaginationParamsDto): Promise<RolesPageResponseDto> {
    const { limit, offset, term } = paginationDto;
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
    return { roles: roles.map((role) => new RoleResponseDto(role)), total };
  }

  async create(roleDto: CreateRoleDto): Promise<RoleResponseDto> {
    const { permissionIds, ...toCreateProps } = roleDto;
    await this.ensureRoleNameIsAvailable(roleDto.name);
    this.assertRoleNameIsNotReserved(roleDto.name);
    const permissions = await this.resolvePermissionsByIds(permissionIds);

    const role = this.roleRepository.create({
      ...toCreateProps,
      permissions,
    });

    try {
      return new RoleResponseDto(await this.roleRepository.save(role));
    } catch (error) {
      this.throwRoleNameConflictIfNeeded(error, roleDto.name);
      throw error;
    }
  }

  async update(id: string, roleDto: UpdateRoleDto): Promise<RoleResponseDto> {
    const { permissionIds, ...roleProps } = roleDto;
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException(`Role with id ${id} not found`);

    this.assertReservedRoleUpdateIsAllowed(role, roleDto);

    if (roleDto.name !== undefined && roleDto.name !== role.name) {
      await this.ensureRoleNameIsAvailable(roleDto.name, role.id);
      this.assertRoleNameIsNotReserved(roleDto.name);
    }

    if (permissionIds !== undefined) {
      role.permissions = await this.resolvePermissionsByIds(permissionIds);
    }

    Object.assign(role, roleProps);

    try {
      return new RoleResponseDto(await this.roleRepository.save(role));
    } catch (error) {
      this.throwRoleNameConflictIfNeeded(error, role.name);
      throw error;
    }
  }

  async getGroupedPermissions() {
    const permissions = await this.permissionRepository.find({
      order: {
        resource: 'ASC',
        action: 'ASC',
      },
    });

    const grouped: Record<string, { id: number; action: string }[]> = {};

    for (const perm of permissions) {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push({
        id: perm.id,
        action: perm.action,
      });
    }

    return Object.entries(grouped).map(([resource, permissions]) => ({ resource, permissions }));
  }

  async findRoleOptions(): Promise<RoleOptionResponseDto[]> {
    const roles = await this.roleRepository.find({
      select: { name: true, id: true, description: true, isAutoAssigned: true },
      order: { name: 'ASC' },
    });

    return roles.map(({ id, name, description, isAutoAssigned }) => ({
      id,
      name,
      description,
      isAutoAssigned,
    }));
  }

  async resolveRolesByIds(roleIds: string[]): Promise<Role[]> {
    if (roleIds.length === 0) return [];

    const roles = await this.roleRepository.findBy({ id: In(roleIds) });
    const rolesById = new Map(roles.map((role) => [role.id, role]));
    const missingRoleIds = roleIds.filter((id) => !rolesById.has(id));

    if (missingRoleIds.length > 0) {
      throw new NotFoundException(`Roles not found: ${missingRoleIds.join(', ')}`);
    }

    return roleIds.map((id) => rolesById.get(id)!);
  }

  private async resolvePermissionsByIds(permissionIds: number[]): Promise<Permission[]> {
    const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
    const permissionsById = new Map(permissions.map((permission) => [permission.id, permission]));
    const missingPermissionIds = permissionIds.filter((id) => !permissionsById.has(id));

    if (missingPermissionIds.length > 0) {
      throw new NotFoundException(`Permissions not found: ${missingPermissionIds.join(', ')}`);
    }

    return permissionIds.map((id) => permissionsById.get(id)!);
  }

  private assertReservedRoleUpdateIsAllowed(role: Role, roleDto: UpdateRoleDto): void {
    if (role.name !== ADMIN_ROLE_NAME) return;

    if (roleDto.name !== undefined && roleDto.name !== ADMIN_ROLE_NAME) {
      throw new BadRequestException(`Role ${ADMIN_ROLE_NAME} cannot be renamed`);
    }

    if (roleDto.isAutoAssigned === true) {
      throw new BadRequestException(`Role ${ADMIN_ROLE_NAME} cannot be auto-assigned`);
    }

    if (roleDto.permissionIds !== undefined) {
      throw new BadRequestException(
        `Permissions for role ${ADMIN_ROLE_NAME} are managed by the access-control bootstrap`,
      );
    }
  }

  private assertRoleNameIsNotReserved(name: string): void {
    if (name.toUpperCase() === ADMIN_ROLE_NAME) {
      throw new BadRequestException(`Role name ${ADMIN_ROLE_NAME} is reserved for the access-control bootstrap`);
    }
  }

  private async ensureRoleNameIsAvailable(name: string, currentRoleId?: string): Promise<void> {
    const existingRole = await this.roleRepository.findOne({ where: { name } });

    if (existingRole && existingRole.id !== currentRoleId) {
      throw new ConflictException(`Role name "${name}" already exists`);
    }
  }

  private throwRoleNameConflictIfNeeded(error: unknown, name: string): void {
    if (!(error instanceof QueryFailedError)) return;

    const driverError = error.driverError as { code?: string };
    if (driverError.code === '23505') {
      throw new ConflictException(`Role name "${name}" already exists`);
    }
  }
}
