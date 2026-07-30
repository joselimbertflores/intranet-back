import { Communication } from '../../communications/entities/communication.entity';
import {
  Column,
  Entity,
  CreateDateColumn,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum WeekDay {
  MO = 'MO',
  TU = 'TU',
  WE = 'WE',
  TH = 'TH',
  FR = 'FR',
  SA = 'SA',
  SU = 'SU',
}

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekDays?: WeekDay[];
  until?: string;
}

@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column({ default: false })
  allDay: boolean;

  @Column({ type: 'jsonb', nullable: true })
  recurrenceConfig: RecurrenceConfig | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Communication, (comm) => comm.calendarEvent, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'communicationId', referencedColumnName: 'id' })
  communication?: Communication | null;

  @Column({
    type: 'uuid',
    nullable: true,
    unique: true,
  })
  communicationId: string | null;
}
