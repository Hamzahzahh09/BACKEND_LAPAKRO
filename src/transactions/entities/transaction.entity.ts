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
import { Product } from '../../products/entities/product.entity';

@Entity('transactions')
export class Transaction {
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

  @Column()
  productId: string;

  @ManyToOne(() => Product, { eager: false, nullable: true })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  deliveryNotes: string | null;

  @Column({ type: 'datetime', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'varchar', default: 'pending' })
  status:
    | 'pending'
    | 'awaiting_seller'
    | 'awaiting_buyer'
    | 'completed'
    | 'cancelled'
    | 'disputed'
    | 'refunded';

  @Column({ default: false })
  escrowReleased: boolean;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
