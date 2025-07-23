import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('entries')
@Index(['userId', 'date'], { unique: true }) // Unique constraint on user + date combination
export class Entry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  rose: string;

  @Column({ type: 'text', nullable: true })
  thorn: string;

  @Column({ type: 'text', nullable: true })
  bud: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // User relationship
  @ManyToOne(() => User, (user) => user.entries, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}
