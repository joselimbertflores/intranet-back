import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { StoredFile } from 'src/modules/files/entities/stored-file.entity';

@Entity('quick_accesses')
@Index(['isActive', 'sortOrder'])
export class QuickAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  imageFileId: string | null;

  @OneToOne(() => StoredFile, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'imageFileId' })
  imageFile: StoredFile | null;

  @Column({ type: 'varchar', length: 2048 })
  url: string;

  @Column({
    type: 'varchar',
    length: 7,
    default: '#477998',
  })
  backgroundColor: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}
