import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quick_accesses')
@Index(['isActive', 'sortOrder'])
export class QuickAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ length: 80, nullable: true })
  icon?: string | null;

  @Column({ type: 'text' })
  linkUrl: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}
