import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tutorial } from './tutorial.entity';

@Entity('tutorial_videos')
export class TutorialVideo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  fileName: string;

  @ManyToOne(() => Tutorial, (tutorial) => tutorial.videos, { onDelete: 'CASCADE' })
  tutorial: Tutorial;
}
