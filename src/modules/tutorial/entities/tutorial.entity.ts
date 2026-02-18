import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TutorialBlock } from './tutorial-block.entity';
import { TutorialCategory } from './tutorial-category.entity';

@Entity('tutorials')
export class Tutorial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @ManyToOne(() => TutorialCategory, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  category?: TutorialCategory | null;

  @OneToMany(() => TutorialBlock, (block) => block.tutorial, {
    cascade: true,
  })
  blocks: TutorialBlock[];

  @Column({ default: true })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
