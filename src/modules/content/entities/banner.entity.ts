import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StoredFile } from 'src/modules/files/entities/stored-file.entity';

export enum PortalBannerLinkType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  subtitle?: string;

  @ManyToOne(() => StoredFile, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn()
  image: StoredFile;

  @Column({ type: 'enum', enum: PortalBannerLinkType, default: PortalBannerLinkType.INTERNAL })
  linkType: PortalBannerLinkType;

  @Column({ type: 'text' })
  @Index()
  url: string;

  @Column({ default: false })
  openInNewTab: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;
}
