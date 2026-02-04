import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { DirectoryContact } from './directory-contact.entity';

@Entity({ name: 'directory_sections' })
export class DirectorySection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => DirectorySection, (s) => s.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  parent?: DirectorySection | null;

  @OneToMany(() => DirectorySection, (s) => s.parent)
  children: DirectorySection[];

  @OneToMany(() => DirectoryContact, (c) => c.section)
  contacts: DirectoryContact[];
}
