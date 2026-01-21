import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany } from 'typeorm';
import { DocumentSubType } from './document-subtype.entiy';
import { SectionDocumentType } from './section-document-type';
import { DocumentSection } from './document-section.entity';

@Entity('document_types')
export class InstitutionalDocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // MANUAL, REGLAMENTO, ORGANIGRAMA

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => DocumentSubType, (st) => st.type, { cascade: true })
  subtypes: DocumentSubType[];

  // @OneToMany(() => SectionDocumentType, (sdt) => sdt.section)
  // sectionDocumentTypes: SectionDocumentType[];

  @ManyToMany(() => DocumentSection, (section) => section.documentTypes)
  sections: DocumentSection[];
}
