import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { PaginationDto } from 'src/modules/common';
import { Permission, Role, User } from '../entities';
import { PERMISSIONS_SEED } from '../constants';
import { CreateUserDto, UpdateUserDto } from '../dtos';
import { AccessTokenPayload } from 'src/modules/auth/interfaces';

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

  async findAll({ limit, offset, term }: PaginationDto) {
    const [users, length] = await this.userRepository.findAndCount({
      take: limit,
      skip: offset,
      ...(term && {
        where: { fullName: ILike(`%${term}%`) },
      }),
      order: {
        createdAt: 'DESC',
      },
    });
    return { users, length };
  }

  async create({ password, ...props }: CreateUserDto) {
    // await this.checkDuplicateLogin(props.login);
    // const encryptedPassword = await this.encryptPassword(password);
    const newUser = this.userRepository.create({ ...props });
    return await this.userRepository.save(newUser);
  }

  async update(id: string, user: UpdateUserDto) {
    const userDB = await this.userRepository.findOneBy({ id });
    if (!userDB) throw new NotFoundException(`El usuario editado no existe`);
    // if (user.login !== userDB.login && user.login) await this.checkDuplicateLogin(user.login);
    if (user.password) user['password'] = await this.encryptPassword(user.password);
    return await this.userRepository.save({ id, ...user });
  }

  async syncUserFromIdentity(payload: AccessTokenPayload, defaultRole?: string) {
    const role = defaultRole ? await this.roleRepository.findOneBy({ name: defaultRole }) : null;
    const externalKey = payload.externalKey;
    let user = await this.userRepository.findOne({ where: { externalKey } });
    console.log(user);
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

  private async encryptPassword(password: string): Promise<string> {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(password, salt);
  }
}
