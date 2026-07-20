import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { StoredFile } from '../../files/entities/stored-file.entity';
import { User } from '../../users/entities/user.entity';

@Entity('landing_notices')
@Index(['isActive', 'isPinned', 'createdAt'])
@Check('CHK_landing_notices_content', '"contentHtml" IS NOT NULL OR "imageId" IS NOT NULL')
@Check(
  'CHK_landing_notices_image_metadata',
  '("imageId" IS NULL AND "imageAlt" IS NULL AND "imageLinkUrl" IS NULL) OR ("imageId" IS NOT NULL AND "imageAlt" IS NOT NULL)',
)
@Check(
  'CHK_landing_notices_visibility',
  '"visibleFrom" IS NULL OR "visibleUntil" IS NULL OR "visibleFrom" <= "visibleUntil"',
)
export class LandingNotice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  contentHtml: string | null;

  @Column({ type: 'uuid', nullable: true, unique: true })
  imageId: string | null;

  @OneToOne(() => StoredFile, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'imageId' })
  image: StoredFile | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageAlt: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  imageLinkUrl: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  visibleFrom: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  visibleUntil: Date | null;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
