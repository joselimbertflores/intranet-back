import {
  Index,
  Column,
  Entity,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TypeCommunication } from './type-communication.entity';

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
  originalName: string;

  @Column({ nullable: true })
  previewName?: string;

  @ManyToOne(() => TypeCommunication, (type) => type.communications, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  type: TypeCommunication;

  @CreateDateColumn()
  publicationDate: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.replace(/\s+/g, ' ').trim().toUpperCase();
  }
}
