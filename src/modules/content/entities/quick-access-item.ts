import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quick_access_items')
export class QuickAccessItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  name: string;

  @Column({ length: 60 })
  icon: string;

  @Column({ type: 'text' })
  @Index()
  url: string;

  @Column({ type: 'int', default: 0 })
  order: number;
}
