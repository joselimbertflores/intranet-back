import { Communication } from 'src/modules/communications/entities';
import {
  Column,
  Entity,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export interface RecurrenceConfig {
  frequency: string;
  interval: number;
  byWeekDays?: string[];
}
@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ default: false })
  allDay: boolean;

  @Column({ type: 'varchar', nullable: true })
  recurrenceRule: string | null;

  @Column({ type: 'jsonb', nullable: true })
  recurrenceConfig: RecurrenceConfig | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Communication, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'communication_id' })
  communication?: Communication;
}
