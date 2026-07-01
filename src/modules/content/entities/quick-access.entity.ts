import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quick_accesses')
@Index(['isActive', 'sortOrder'])
export class QuickAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ length: 40 })
  iconKey: string;

  @Column({ length: 7, default: '#2563EB' })
  color: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}
