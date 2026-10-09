import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryColumn()
  id: string;

  @Column()
  buyerId: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'buyerId' })
  buyer?: User;

  @Column()
  sellerId: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'sellerId' })
  seller?: User;

  @Column({ type: 'varchar', length: 36, nullable: true })
  transactionId?: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  productId?: string | null;

  @Column({ type: 'text', nullable: true })
  lastMessage?: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastMessageAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
