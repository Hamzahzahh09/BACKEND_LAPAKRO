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

@Entity('products')
export class Product {
  @PrimaryColumn()
  id: string;

  @Column()
  sellerId: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'sellerId' })
  seller?: User;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column()
  category: string;

  @Column({ type: 'simple-json', nullable: true })
  images: string[];

  @Column({ default: 1 })
  stock: number;

  @Column({ default: 'manual' })
  deliveryMethod: string;

  @Column({ type: 'simple-json', nullable: true })
  proofFiles: string[];

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'active' | 'rejected' | 'archived';

  @Column({ type: 'float', default: 0 })
  averageRating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column({ default: 0 })
  soldCount: number;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'varchar', nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
