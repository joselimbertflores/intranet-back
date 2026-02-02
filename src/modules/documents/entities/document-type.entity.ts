import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany } from 'typeorm';
import { DocumentSubType } from './document-subtype.entiy';
import { DocumentSection } from './document-section.entity';

@Entity('document_types')
export class InstitutionalDocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => DocumentSubType, (st) => st.type, { cascade: true })
  subtypes: DocumentSubType[];

  @ManyToMany(() => DocumentSection, (section) => section.documentTypes)
  sections: DocumentSection[];
}
