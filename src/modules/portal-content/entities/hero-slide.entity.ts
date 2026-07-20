import { Check, Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { StoredFile } from 'src/modules/files/entities/stored-file.entity';

@Entity('hero_slides')
@Index(['isActive', 'sortOrder'])
@Check(
  'CHK_hero_slides_link',
  '("linkLabel" IS NULL AND "linkUrl" IS NULL) OR ("linkLabel" IS NOT NULL AND "linkUrl" IS NOT NULL)',
)
export class HeroSlide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  linkLabel: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  linkUrl: string | null;

  @Column({ type: 'uuid' })
  imageId: string;

  @OneToOne(() => StoredFile, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'imageId' })
  image: StoredFile;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}
