import {
  Index,
  Column,
  Entity,
  OneToOne,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommunicationType } from './communication-type.entity';
import { CalendarEvent } from '../../calendar/entities/calendar-event.entity';
import { StoredFile } from '../../files/entities/stored-file.entity';

@Entity('communications')
export class Communication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 160 })
  reference: string;

  @Index()
  @Column({ type: 'varchar', length: 80, unique: true })
  code: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => CommunicationType, (type) => type.communications, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  type: CommunicationType;

  @OneToOne(() => StoredFile)
  @JoinColumn()
  file: StoredFile;

  @OneToOne(() => CalendarEvent, (event) => event.communication)
  calendarEvent?: CalendarEvent;
}
