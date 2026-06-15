import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Permission } from './permission.entity';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isAutoAssigned: boolean;

  // N:N → un rol tiene muchos permisos
  @ManyToMany(() => Permission, (perm) => perm.roles)
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];

  // N:N → un rol puede aplicarse a varios usuarios
  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;
}
