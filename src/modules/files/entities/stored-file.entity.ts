import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

// file-status.enum.ts
export enum FileStatus {
  PENDING = 'PENDING', // subido pero aún no asociado
  ACTIVE = 'ACTIVE', // en uso por alguna entidad
  ORPHANED = 'ORPHANED', // perdió su referencia
}

export enum StoredFileKind {
  ORIGINAL = 'ORIGINAL',
  PREVIEW = 'PREVIEW',
  THUMBNAIL = 'THUMBNAIL',
}

@Entity('files')
export class StoredFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // nombre físico (uuid.ext)
  @Column()
  storedName: string;

  // nombre original (para UI / descargas)
  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column('bigint')
  sizeBytes: number;

  // ej: communications/uuid.pdf
  @Column()
  storageKey: string;

  @Column({ default: 0 })
  downloadCount: number;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.PENDING,
  })
  status: FileStatus;

  @Column({
    type: 'enum',
    enum: StoredFileKind,
    default: StoredFileKind.ORIGINAL,
  })
  kind: StoredFileKind;

  /**
   * Relación self-reference
   * - null  → archivo original
   * - value → archivo derivado (preview, thumbnail, etc.)
   */
  @Column({ type: 'uuid', nullable: true })
  sourceFileId?: string | null;

  @ManyToOne(() => StoredFile, (file) => file.derivedFiles, { nullable: true })
  @JoinColumn({ name: 'sourceFileId' })
  sourceFile?: StoredFile | null;

  @OneToMany(() => StoredFile, (file) => file.sourceFile)
  derivedFiles?: StoredFile[];

  // auditoría básica
  @Column({ nullable: true })
  createdBy?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
