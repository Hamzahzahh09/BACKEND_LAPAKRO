import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('seller_ratings')
export class SellerRating {
  @PrimaryColumn()
  id: string;

  @Column()
  sellerId: string;

  @Column()
  buyerId: string;

  @Column()
  rating: number; // 1-5 stars

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'json', nullable: true })
  aspects?: {
    productQuality: number;
    communication: number;
    shipping: number;
    accuracy: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;
}
