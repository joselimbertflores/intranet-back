import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';

@Entity('directory_entries')
export class DirectoryEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  internalPhone?: string;

  @Column({ nullable: true })
  landlinePhone?: string;

  @ManyToOne(() => DirectoryEntry, (entry) => entry.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  parent?: DirectoryEntry | null;

  @OneToMany(() => DirectoryEntry, (entry) => entry.parent)
  children: DirectoryEntry[];

  @Column({ default: 0 })
  order: number;
}
