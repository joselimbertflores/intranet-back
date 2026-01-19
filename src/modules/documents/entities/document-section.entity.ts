import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SectionDocumentType } from './section-document-type';

@Entity('document_sections')
export class DocumentSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => SectionDocumentType, (sdt) => sdt.section)
  sectionDocumentTypes: SectionDocumentType[];
}
