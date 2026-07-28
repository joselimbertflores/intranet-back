import {
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { StoredFile } from 'src/modules/files/entities/stored-file.entity';
import { OrganizationalUnit } from './organizational-unit.entity';
import { DocumentSubtype } from './document-subtype.entity';
import { DocumentType } from './document-type.entity';
import { User } from 'src/modules/users/entities';

export enum DocumentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum DocumentValidityStatus {
  CURRENT = 'CURRENT',
  HISTORICAL = 'HISTORICAL',
}

@Entity('documents')
export class DocumentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({
    name: 'validity_status',
    type: 'enum',
    enum: DocumentValidityStatus,
    nullable: false,
    default: DocumentValidityStatus.CURRENT,
  })
  validityStatus: DocumentValidityStatus;

  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ name: 'organizational_unit_id', type: 'uuid', nullable: true })
  organizationalUnitId: string | null;

  @ManyToOne(() => OrganizationalUnit, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organizational_unit_id' })
  organizationalUnit: OrganizationalUnit | null;

  @Column({ name: 'document_type_id', type: 'int' })
  documentTypeId: number;

  @ManyToOne(() => DocumentType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_type_id' })
  type: DocumentType;

  @Column({ name: 'document_subtype_id', type: 'int', nullable: true })
  documentSubtypeId: number | null;

  @ManyToOne(() => DocumentSubtype, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_subtype_id' })
  subtype: DocumentSubtype | null;

  @OneToOne(() => StoredFile, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'file_id' })
  file: StoredFile;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.ACTIVE,
  })
  status: DocumentStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
