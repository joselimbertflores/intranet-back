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

// @Entity('document_subtypes')
// // @Unique(['type', 'name'])
// export class DocumentSubType {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @ManyToOne(() => DocumentType, (t) => t.subtypes)
//   type: DocumentType;

//   @Column()
//   name: string; // FUNCIONES, PROCEDIMIENTOS

//   @Column({ default: true })
//   isActive: boolean;
// }

@Entity('document_subtypes')
@Unique(['type', 'slug'])
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
  })
  @JoinColumn({ name: 'type_id' })
  type: DocumentType;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeSlug() {
    this.slug = generateSlug(this.name);
  }
}
