import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DocumentSubType } from './document-subtype.entiy';

@Entity('document_types')
export class InstitutionalDocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // MANUAL, REGLAMENTO, ORGANIGRAMA

  @OneToMany(() => DocumentSubType, (st) => st.type, { cascade: true })
  subtypes: DocumentSubType[];
}
