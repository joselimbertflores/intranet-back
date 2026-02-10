import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

// @Entity('document_sections')
// export class DocumentSection {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column({ unique: true })
//   name: string;

//   @Column({ default: true })
//   isActive: boolean;

//   // @OneToMany(() => SectionDocumentType, (sdt) => sdt.section)
//   // sectionDocumentTypes: SectionDocumentType[];

//   @ManyToMany(() => InstitutionalDocumentType, (docType) => docType.sections)
//   @JoinTable({
//     name: 'section_document_types',
//   })
//   documentTypes: InstitutionalDocumentType[];
// }

@Entity('sections')
export class DocumentSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @ManyToOne(() => DocumentSection, (section) => section.children, {
    nullable: true,
  })
  parent: DocumentSection | null;

  @OneToMany(() => DocumentSection, (section) => section.parent)
  children: DocumentSection[];

  @Column({ type: 'int', default: 0 })
  level: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
