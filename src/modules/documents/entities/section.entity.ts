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
export class Section {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @ManyToOne(() => Section, (section) => section.children, {
    nullable: true,
  })
  parent: Section | null;

  @OneToMany(() => Section, (section) => section.parent)
  children: Section[];

  @Column({ type: 'int', default: 0 })
  level: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
