import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { StoredFile } from 'src/modules/files/entities/stored-file.entity';

@Entity('hero_slides')
@Index(['isActive', 'sortOrder'])
export class HeroSlide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ length: 80, nullable: true })
  linkLabel?: string | null;

  @Column({ type: 'text', nullable: true })
  linkUrl?: string | null;

  @Column({ type: 'uuid' })
  fileId: string;

  @ManyToOne(() => StoredFile, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fileId' })
  file: StoredFile;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}
