import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const QUICK_ACCESS_ICON_KEYS = [
  'email',
  'application',
  'document',
  'book',
  'form',
  'report',
  'calendar',
  'user',
  'support',
  'finance',
  'vehicle',
  'external-link',
] as const;

export type QuickAccessIconKey = (typeof QUICK_ACCESS_ICON_KEYS)[number];

@Entity('quick_accesses')
@Index(['isActive', 'sortOrder'])
export class QuickAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 40 })
  iconKey: QuickAccessIconKey;

  @Column({ type: 'varchar', length: 2048 })
  url: string;

  @Column({
    type: 'varchar',
    length: 7,
    default: '#477998',
  })
  backgroundColor: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}
