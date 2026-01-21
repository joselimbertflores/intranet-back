import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SectionDocumentType } from './section-document-type';
import { InstitutionalDocumentType } from './document-type.entity';

@Entity('document_sections')
export class DocumentSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  // @OneToMany(() => SectionDocumentType, (sdt) => sdt.section)
  // sectionDocumentTypes: SectionDocumentType[];

  @ManyToMany(() => InstitutionalDocumentType, (docType) => docType.sections)
  @JoinTable({
    name: 'section_document_types',
  })
  documentTypes: InstitutionalDocumentType[];
}
