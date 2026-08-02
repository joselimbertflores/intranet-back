import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

import { Tutorial } from './tutorial.entity';

@Entity('tutorial_categories')
export class TutorialCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 120, unique: true })
  slug: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Tutorial, (tutorial) => tutorial.category)
  tutorials: Tutorial[];
}
