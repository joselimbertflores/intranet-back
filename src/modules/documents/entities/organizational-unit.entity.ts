import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { generateSlug } from 'src/helpers';

@Entity('organizational_units')
export class OrganizationalUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => OrganizationalUnit, (organizationalUnit) => organizationalUnit.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: OrganizationalUnit | null;

  @OneToMany(() => OrganizationalUnit, (organizationalUnit) => organizationalUnit.parent)
  children: OrganizationalUnit[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeSlug() {
    this.slug = generateSlug(this.name);
  }
}
