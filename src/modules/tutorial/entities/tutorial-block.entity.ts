import { StoredFile } from 'src/modules/files/entities/stored-file.entity';
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, OneToOne, JoinColumn } from 'typeorm';

import { Tutorial } from './tutorial.entity';

export enum TutorialBlockType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
}

@Entity('tutorial_blocks')
export class TutorialBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @OneToOne(() => StoredFile, { nullable: true })
  @JoinColumn()
  file?: StoredFile;

  @ManyToOne(() => Tutorial, (tutorial) => tutorial.blocks, {
    onDelete: 'CASCADE',
  })
  tutorial: Tutorial;

  @Column({
    type: 'enum',
    enum: TutorialBlockType,
  })
  type: TutorialBlockType;

  @Column()
  order: number;
}
