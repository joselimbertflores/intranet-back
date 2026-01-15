import { Column, Entity, ManyToOne, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

import { InstitutionalDocumentType } from './document-type.entity';
import { DocumentSection } from './document-section.entity';
import { DocumentSubType } from './document-subtype.entiy';

@Entity('documents')
export class InstitutionalDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  sizeBytes: number;

  @Column({ type: 'int' })
  fiscalYear: number;

  @Column({ default: 0 })
  downloadCount: number;

  @Column({ type: 'enum', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' })
  status: string;

  @ManyToOne(() => DocumentSection)
  section: DocumentSection;

  @ManyToOne(() => InstitutionalDocumentType)
  type: InstitutionalDocumentType;

  @ManyToOne(() => DocumentSubType, { nullable: true })
  subtype?: DocumentSubType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
