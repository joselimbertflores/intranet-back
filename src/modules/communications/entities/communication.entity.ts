import {
  Index,
  Column,
  Entity,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { TypeCommunication } from './type-communication.entity';
import { CalendarEvent } from 'src/modules/calendar/entities';

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

  @Column()
  fileName: string;

  @Column()
  previewFileName: string;

  @Column()
  originalName: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => TypeCommunication, (type) => type.communications, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  type: TypeCommunication;

  @OneToOne(() => CalendarEvent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  calendarEvent: CalendarEvent | null;

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.replace(/\s+/g, ' ').trim().toUpperCase();
  }
}
