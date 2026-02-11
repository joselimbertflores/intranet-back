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
  ORPHAN = 'ORPHAN', // perdió su referencia
  REMOVED = 'REMOVED', // eliminado lógico
}

@Entity('files')
export class StoredFile {
  @PrimaryGeneratedColumn()
  id: number;

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

  /**
   * Relación self-reference
   * - null  → archivo original
   * - value → archivo derivado (preview, thumbnail, etc.)
   */
  @Column({ nullable: true })
  parentFileId?: number;

  @ManyToOne(() => StoredFile, (file) => file.derivedFiles, { nullable: true })
  @JoinColumn({ name: 'parentFileId' })
  parentFile?: StoredFile;

  @OneToMany(() => StoredFile, (file) => file.parentFile)
  derivedFiles?: StoredFile[];

  // auditoría básica
  @Column({ nullable: true })
  createdBy?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
