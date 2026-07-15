import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { DirectoryEntry } from './directory-entry.entity';

@Entity('directory_sites')
export class DirectorySite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120, unique: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => DirectoryEntry, (entry) => entry.site)
  entries: DirectoryEntry[];
}
