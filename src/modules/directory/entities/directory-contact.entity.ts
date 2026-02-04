import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { DirectorySection } from './directory-section.entity';

@Entity({ name: 'directory_contacts' })
@Index(['section', 'order'])
export class DirectoryContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 140 })
  title: string; // "Secretario(a)", "Jefe de Unidad"

  @Column({ type: 'varchar', length: 30, nullable: true })
  internalPhone?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  externalPhone?: string | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => DirectorySection, (s) => s.contacts, { nullable: false, onDelete: 'RESTRICT' })
  section: DirectorySection;
}
