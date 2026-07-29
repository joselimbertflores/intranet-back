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
@Unique('uq_document_subtypes_type_slug', ['type', 'slug'])
export class DocumentSubtype {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  slug: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => DocumentType, (type) => type.subtypes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'type_id' })
  type: DocumentType;

  @Column({ name: 'type_id' })
  typeId: number;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeSlug() {
    this.slug = generateSlug(this.name);
  }
}
