import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const QUICK_ACCESS_ICON_KEYS = [
  'email',
  'application',
  'document',
  'book',
  'form',
  'support',
  'link',
  'external',
  'dashboard',
  'report',
  'user',
  'calendar',
  'settings',
] as const;

export type QuickAccessIconKey = (typeof QUICK_ACCESS_ICON_KEYS)[number];
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
  iconKey: QuickAccessIconKey;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}
