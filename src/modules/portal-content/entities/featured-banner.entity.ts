import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { StoredFile } from 'src/modules/files/entities/stored-file.entity';

@Entity('featured_banners')
@Index(['isActive', 'sortOrder'])
export class FeaturedBanner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  linkLabel: string | null;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  @Column({ type: 'uuid' })
  imageFileId: string;

  @OneToOne(() => StoredFile, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'imageFileId' })
  imageFile: StoredFile;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}
