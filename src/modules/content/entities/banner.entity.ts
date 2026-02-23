import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StoredFile } from 'src/modules/files/entities/stored-file.entity';

export enum BannerLinkType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  subtitle?: string;

  @OneToOne(() => StoredFile, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn()
  image: StoredFile;

  @Column({ type: 'enum', enum: BannerLinkType, default: BannerLinkType.INTERNAL })
  linkType: BannerLinkType;

  @Column({ type: 'text', nullable: true })
  url: string;

  @Column({ default: false })
  openInNewTab: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;
}
