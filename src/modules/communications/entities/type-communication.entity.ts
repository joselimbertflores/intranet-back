import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Communication } from './communication.entity';

@Entity()
@Unique(['name'])
export class CommunicationType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @OneToMany(() => Communication, (c) => c.type)
  communications: Communication[];
}
