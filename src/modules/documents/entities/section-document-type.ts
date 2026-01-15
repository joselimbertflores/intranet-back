import { Entity, Unique, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { DocumentSection } from './document-section.entity';
import { InstitutionalDocumentType } from './document-type.entity';

@Entity('section_document_types')
@Unique(['section', 'type'])
export class SectionDocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DocumentSection)
  section: DocumentSection;

  @ManyToOne(() => InstitutionalDocumentType)
  type: InstitutionalDocumentType;
}
