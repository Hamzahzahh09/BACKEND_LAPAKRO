import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryColumn()
  id: string;

  @Column()
  transactionId: string;

  @Column()
  productId: string;

  @Column()
  sellerId: string;

  @Column()
  buyerId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  images: string[];

  @Column({ type: 'text', nullable: true })
  reply: string | null;

  @Column({ type: 'datetime', nullable: true })
  repliedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
