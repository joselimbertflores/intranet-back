import {
  Column,
  Entity,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';

import { DocumentType } from './document-type.entity';
import { OrganizationalUnit } from './organizational-unit.entity';
import { DocumentSubtype } from './document-subtype.entity';
import { StoredFile } from 'src/modules/files/entities/stored-file.entity';

export enum DocumentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('documents')
export class DocumentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'fiscal_year', type: 'int', nullable: true })
  fiscalYear: number | null;

  @Column({ name: 'organizational_unit_id', type: 'uuid' })
  organizationalUnitId: string;

  @ManyToOne(() => OrganizationalUnit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organizational_unit_id' })
  organizationalUnit: OrganizationalUnit;

  @Column({ name: 'document_type_id', type: 'int' })
  documentTypeId: number;

  @ManyToOne(() => DocumentType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_type_id' })
  documentType: DocumentType;

  @Column({ name: 'document_subtype_id', type: 'int', nullable: true })
  documentSubtypeId: number | null;

  @ManyToOne(() => DocumentSubtype, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_subtype_id' })
  documentSubtype: DocumentSubtype | null;

  @ManyToOne(() => StoredFile, { nullable: false, onDelete: 'RESTRICT' })
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
