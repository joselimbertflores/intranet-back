import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, Unique } from 'typeorm';
import { Role } from './role.entity';

export enum Resource {
  USERS = 'users',
  COMMUNICATIONS = 'communications',
  DOCUMENTS = 'documents',
  TUTORIALS = 'tutorials',
  CONTENT = 'content',
}
@Unique(['resource', 'action'])
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  resource: Resource;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
