import {
  Index,
  Column,
  Entity,
  OneToOne,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TypeCommunication } from './type-communication.entity';
import { StoredFile } from 'src/modules/files/entities/stored-file.entity';

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

  @ManyToOne(() => TypeCommunication, (type) => type.communications, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  type: TypeCommunication;

  @OneToOne(() => StoredFile)
  @JoinColumn()
  file: StoredFile;

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.replace(/\s+/g, ' ').trim().toUpperCase();
  }
}
