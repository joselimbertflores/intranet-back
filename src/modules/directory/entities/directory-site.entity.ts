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

  @Column({
    type: 'double precision',
    nullable: true,
  })
  latitude: number | null;

  @Column({
    type: 'double precision',
    nullable: true,
  })
  longitude: number | null;

  @OneToMany(() => DirectoryEntry, (entry) => entry.site)
  entries: DirectoryEntry[];
}
