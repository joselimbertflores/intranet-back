import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { DocumentSubtype } from './document-subtype.entity';
import { generateSlug } from 'src/helpers';

// @Entity('document_types')
// export class InstitutionalDocumentType {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column({ unique: true })
//   name: string;

//   @Column({ default: true })
//   isActive: boolean;

//   @OneToMany(() => DocumentSubType, (st) => st.type, { cascade: true })
//   subtypes: DocumentSubType[];

//   @ManyToMany(() => Section, (section) => section.documentTypes)
//   sections: Section[];
// }

@Entity('document_types')
export class DocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => DocumentSubtype, (subtype) => subtype.type, { cascade: ['insert', 'update'] })
  subtypes: DocumentSubtype[];

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeSlug() {
    this.slug = generateSlug(this.name);
  }
}
