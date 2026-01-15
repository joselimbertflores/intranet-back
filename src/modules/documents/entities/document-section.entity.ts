import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SectionDocumentType } from './section-document-type';

@Entity('document_sections')
export class DocumentSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => SectionDocumentType, (sdt) => sdt.section)
  allowedTypes: SectionDocumentType[];
}
