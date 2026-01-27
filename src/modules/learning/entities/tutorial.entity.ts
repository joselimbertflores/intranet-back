import { BeforeInsert, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TutorialVideo } from './tutorial-videos.entity';
@Entity('tutorials')
export class Tutorial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  image?: string;

  @Column('text', {
    unique: true,
  })
  slug: string;

  @OneToMany(() => TutorialVideo, (video) => video.tutorial, {
    cascade: true,
    eager: true,
  })
  videos: TutorialVideo[];

  @BeforeInsert()
  generateSlug() {
    const normalized = this.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    const suffix = Math.random().toString(36).substring(2, 5);
    this.slug = `${normalized}-${suffix}`;
  }
}
