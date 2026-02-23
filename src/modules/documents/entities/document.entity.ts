import {
  Column,
  Entity,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

import { DocumentType } from './document-type.entity';
import { DocumentSection } from './document-section.entity';
import { DocumentSubtype } from './document-subtype.entity';
import { User } from 'src/modules/users/entities';
import { StoredFile } from 'src/modules/files/entities/stored-file.entity';

// @Entity('documents')
// export class InstitutionalDocument {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   displayName: string;

//   @Column()
//   fileName: string;

//   @Column()
//   originalName: string;

//   @Column()
//   mimeType: string;

//   @Column()
//   sizeBytes: number;

//   @Column({ type: 'int' })
//   fiscalYear: number;

//   @Column({ default: 0 })
//   downloadCount: number;

//   @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.PUBLISHED })
//   status: DocumentStatus;

//   @ManyToOne(() => DocumentSection)
//   section: DocumentSection;

//   @ManyToOne(() => InstitutionalDocumentType)
//   type: InstitutionalDocumentType;

//   @ManyToOne(() => DocumentSubType, { nullable: true })
//   subtype?: DocumentSubType;

//   @ManyToOne(() => User)
//   createdBy: User;

//   @CreateDateColumn({ type: 'timestamptz' })
//   createdAt: Date;

//   @UpdateDateColumn({ type: 'timestamptz' })
//   updatedAt: Date;
// }

@Entity('documents')
export class DocumentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'int' })
  fiscalYear: number;

  @ManyToOne(() => DocumentSection)
  @JoinColumn({ name: 'section_id' })
  section: DocumentSection;

  @ManyToOne(() => DocumentType)
  @JoinColumn({ name: 'type_id' })
  type: DocumentType;

  @ManyToOne(() => DocumentSubtype, { nullable: true })
  @JoinColumn({ name: 'subtype_id' })
  subtype?: DocumentSubtype;

  @ManyToOne(() => StoredFile, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fileId' })
  file: StoredFile;

  @Column()
  fileId: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaultFiscalYear() {
    this.fiscalYear = new Date().getFullYear();
  }
}
