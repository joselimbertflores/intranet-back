import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TutorialCategory } from './tutorial-category.entity';
import { TutorialBlock } from './tutorial-block.entity';

@Entity('tutorials')
export class Tutorial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 200, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @ManyToOne(() => TutorialCategory, (category) => category.tutorials, { nullable: true, onDelete: 'SET NULL' })
  category?: TutorialCategory | null;

  @OneToMany(() => TutorialBlock, (block) => block.tutorial, {
    cascade: true,
  })
  blocks: TutorialBlock[];

  @Column({ default: false })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
