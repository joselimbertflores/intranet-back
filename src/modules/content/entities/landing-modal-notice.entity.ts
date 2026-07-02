import {
  Column,
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

@Entity('landing_modal_notices')
@Index(['isActive', 'isPinned', 'createdAt'])
export class LandingModalNotice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  contentHtml: string | null;

  @Column({ type: 'uuid', nullable: true, unique: true })
  imageId: string | null;

  @OneToOne(() => StoredFile, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn()
  image: StoredFile | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageAlt: string | null;

  @Column({ type: 'text', nullable: true })
  imageLinkUrl: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  visibleFrom: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  visibleUntil: Date | null;

  @Column({ default: false })
  isPinned: boolean;

  @Column()
  createdById: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn()
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn()
  updatedBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
