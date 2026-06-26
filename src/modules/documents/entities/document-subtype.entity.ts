import {
  Entity,
  Unique,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  JoinColumn,
  CreateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { DocumentType } from './document-type.entity';
import { generateSlug } from 'src/helpers';

@Entity('document_subtypes')
@Unique(['documentType', 'slug'])
export class DocumentSubtype {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  slug: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => DocumentType, (documentType) => documentType.subtypes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'document_type_id' })
  documentType: DocumentType;

  @Column({ name: 'document_type_id' })
  documentTypeId: number;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeSlug() {
    this.slug = generateSlug(this.name);
  }
}
