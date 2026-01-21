import {
  Index,
  Column,
  Entity,
  Unique,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TypeCommunication } from './type-communication.entity';

@Entity('communications')
@Unique(['code'])
export class Communication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 160 })
  reference: string;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  code: string;

  @CreateDateColumn()
  publicationDate: Date;

  @Column()
  originalName: string;

  @Column()
  fileName: string;

  @Column({ nullable: true })
  previewName?: string;

  @ManyToOne(() => TypeCommunication, (type) => type.communications, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  type: TypeCommunication;

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.replace(/\s+/g, ' ').trim().toUpperCase();
  }
}
