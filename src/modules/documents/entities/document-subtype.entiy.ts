import { Entity, Unique, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { InstitutionalDocumentType } from './document-type.entity';

@Entity('document_subtypes')
@Unique(['type', 'name'])
export class DocumentSubType {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => InstitutionalDocumentType, (t) => t.subtypes)
  type: InstitutionalDocumentType;

  @Column()
  name: string; // FUNCIONES, PROCEDIMIENTOS
}
