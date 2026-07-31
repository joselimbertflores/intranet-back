import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DirectorySite } from './directory-site.entity';

@Entity('directory_entries')
export class DirectoryEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 160 })
  areaName: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  contactLabel: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  extensions: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  phones: string[];

  @Column({ type: 'varchar', length: 160, nullable: true })
  email: string | null;

  @Column({ type: 'int', nullable: true })
  siteId: number | null;

  @ManyToOne(() => DirectorySite, (site) => site.entries, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'siteId' })
  site: DirectorySite | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  siteDetails: string | null;

  @Column({ default: true })
  isActive: boolean;
}
