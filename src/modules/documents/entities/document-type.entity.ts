import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  Unique,
} from 'typeorm';
import { DocumentSubtype } from './document-subtype.entity';
import { generateSlug } from 'src/helpers';

@Entity('document_types')
@Unique('uq_document_types_slug', ['slug'])
export class DocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
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
